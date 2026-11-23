import { readFileSync, existsSync } from "fs";
import path from "path";
import { armMeasures } from "./effects.ts";
import { da } from "./sources.ts";

export type EffectSource = { name: string; url: string };

export type EffectRecord = {
  id: string;
  substanceSlug: string;
  product: string;
  code: string;
  makers: string;
  companySlugs: string[];
  notCovered: string[];
  trial: string;
  population: string;
  endpoint: string;
  dataCutoff: string;
  followUp: string;
  arms: {
    treated: { label: string; events: number; n: number };
    control: { label: string; events: number; n: number };
  };
  publishedEffect: {
    label: string;
    value: number;
    polackCri: { level: number; low: number; high: number; kind: string };
    emaCi: { level: number; low: number; high: number; method: string; table: string };
  };
  sources: EffectSource[];
  retrieved: string;
  caveats: string[];
};

export type EffectView = {
  record: EffectRecord;
  rrr: string;
  arr: string;
  nnt: string;
  published: string;
  polackLow: string;
  polackHigh: string;
  emaLow: string;
  emaHigh: string;
  treatedEvents: string;
  treatedN: string;
  controlEvents: string;
  controlN: string;
};

export function effectRecords(): EffectRecord[] {
  const file = path.join(process.cwd(), "data", "effects.json");
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { effects?: EffectRecord[] };
  return parsed.effects ?? [];
}

export function effectForSubstance(slug: string): EffectView | null {
  const record = effectRecords().find((item) => item.substanceSlug === slug);
  if (!record) return null;
  const measures = armMeasures(
    record.arms.treated.events,
    record.arms.treated.n,
    record.arms.control.events,
    record.arms.control.n,
  );
  if (!measures || measures.rrr === null || measures.nnt === null) return null;
  const percent = (value: number, digits: number) => da(value * 100, digits);
  return {
    record,
    rrr: percent(measures.rrr, 1),
    arr: da(measures.arr * 100, 2),
    nnt: measures.nnt.toLocaleString("da-DK"),
    published: percent(record.publishedEffect.value, 1),
    polackLow: percent(record.publishedEffect.polackCri.low, 1),
    polackHigh: percent(record.publishedEffect.polackCri.high, 1),
    emaLow: percent(record.publishedEffect.emaCi.low, 1),
    emaHigh: percent(record.publishedEffect.emaCi.high, 1),
    treatedEvents: record.arms.treated.events.toLocaleString("da-DK"),
    treatedN: record.arms.treated.n.toLocaleString("da-DK"),
    controlEvents: record.arms.control.events.toLocaleString("da-DK"),
    controlN: record.arms.control.n.toLocaleString("da-DK"),
  };
}
