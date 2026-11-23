import { readFileSync, existsSync } from "fs";
import path from "path";
import { armMeasures } from "./effects.ts";
import { da } from "./sources.ts";

export type EffectSource = { name: string; url: string };

export type EffectInterval = {
  before: string;
  low: number;
  high: number;
  after?: string;
};

export type EffectPostponement = {
  days: number;
  spread?: number;
  overYears: number;
  method: string;
  sourceName: string;
  sourceUrl: string;
};

export type EffectRecord = {
  id: string;
  substanceSlug: string;
  product: string;
  code?: string;
  makers?: string;
  companySlugs?: string[];
  notCovered?: string[];
  trial: string;
  heading?: string;
  kicker?: string;
  population: string;
  endpoint: string;
  dataCutoff?: string;
  followUp?: string;
  periodNote?: string;
  treatedGroup: string;
  controlGroup: string;
  action: string;
  prevented: string;
  limits?: string;
  calculationNote?: string;
  arms: {
    treated: { events: number; n?: number };
    control: { events: number; n?: number };
  };
  publishedEffect?: {
    label: string;
    value: number;
    unit?: "percent" | "ratio";
    intervals?: EffectInterval[];
    polackCri?: { level: number; low: number; high: number; kind: string };
    emaCi?: { level: number; low: number; high: number; method: string; table: string };
  };
  postponement?: EffectPostponement;
  learnMoreHref?: string;
  learnMoreLabel?: string;
  sources: EffectSource[];
  retrieved: string;
  caveats: string[];
};

export type ShownInterval = { before: string; low: string; high: string; after?: string };

export type EffectView = {
  record: EffectRecord;
  rrr: string | null;
  arr: string | null;
  arrShare: string | null;
  nntRaw: string | null;
  nnt: string | null;
  published: string | null;
  intervals: ShownInterval[];
  treatedEvents: string;
  treatedN: string | null;
  controlEvents: string;
  controlN: string | null;
  postponementDays: string | null;
  postponementYears: string | null;
  postponementSpread: string | null;
};

function percent(value: number, digits: number): string {
  return da(value * 100, digits);
}

export function effectRecords(): EffectRecord[] {
  const file = path.join(process.cwd(), "data", "effects.json");
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { effects?: EffectRecord[] };
  return parsed.effects ?? [];
}

export function effectsForSubstance(slug: string): EffectView[] {
  return effectRecords().filter((item) => item.substanceSlug === slug).map(effectView).filter((item): item is EffectView => item !== null);
}

export function effectView(record: EffectRecord): EffectView | null {
  const treatedN = record.arms.treated.n;
  const controlN = record.arms.control.n;
  const measures =
    treatedN && controlN
      ? armMeasures(record.arms.treated.events, treatedN, record.arms.control.events, controlN)
      : null;
  const published = record.publishedEffect;
  const intervals: ShownInterval[] = [];
  if (published?.polackCri) {
    intervals.push({
      before: "Polack og kolleger angiver et 95 % kredibilitetsinterval på",
      low: percent(published.polackCri.low, 1),
      high: percent(published.polackCri.high, 1),
    });
  }
  if (published?.emaCi) {
    intervals.push({
      before: `EMA-produktinformationen, ${published.emaCi.table}, angiver et 95 % konfidensinterval på`,
      low: percent(published.emaCi.low, 1),
      high: percent(published.emaCi.high, 1),
      after: `efter ${published.emaCi.method}`,
    });
  }
  for (const interval of published?.intervals ?? []) {
    intervals.push({
      before: interval.before,
      low: published?.unit === "ratio" ? da(interval.low, 2) : percent(interval.low, 1),
      high: published?.unit === "ratio" ? da(interval.high, 2) : percent(interval.high, 1),
      after: interval.after,
    });
  }
  return {
    record,
    rrr: measures?.rrr === null || measures?.rrr === undefined ? null : percent(measures.rrr, 1),
    arr: measures ? da(measures.arr * 100, 2) : null,
    arrShare: measures ? da(measures.arr, 4) : null,
    nntRaw: measures ? da(1 / measures.arr, 2) : null,
    nnt: measures?.nnt === null || measures?.nnt === undefined ? null : measures.nnt.toLocaleString("da-DK"),
    published: published
      ? published.unit === "ratio"
        ? da(published.value, 2)
        : percent(published.value, 1)
      : null,
    intervals,
    treatedEvents: record.arms.treated.events.toLocaleString("da-DK"),
    treatedN: treatedN ? treatedN.toLocaleString("da-DK") : null,
    controlEvents: record.arms.control.events.toLocaleString("da-DK"),
    controlN: controlN ? controlN.toLocaleString("da-DK") : null,
    postponementDays: record.postponement ? da(record.postponement.days, 2) : null,
    postponementYears: record.postponement ? da(record.postponement.overYears, 1) : null,
    postponementSpread: record.postponement?.spread !== undefined ? da(record.postponement.spread, 2) : null,
  };
}
