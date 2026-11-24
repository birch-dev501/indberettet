import { readFileSync } from "fs";
import path from "path";
import { da } from "./sources.ts";

export type HarmGroupId = "established" | "signal" | "unsupported";

export type HarmRatio = { name: string; value: number; low: number; high: number; digits: number };

export type HarmMeasure = {
  id: string;
  label: string;
  block?: string;
  value?: number;
  low?: number;
  high?: number;
  digits?: number;
  per?: number;
  kind: "excess" | "rate" | "identified" | "ratio" | "share";
  cases?: number;
  n?: number;
  statedPerMillion?: number;
  ratio?: HarmRatio;
  applies: string;
  sourceName: string;
  sourceUrl: string;
  place: string;
};

export type HarmLink = { name: string; url: string };

export type HarmFinding = {
  id: string;
  group: HarmGroupId;
  heading: string;
  body: string;
  note?: string;
  measures: HarmMeasure[];
  links?: HarmLink[];
};

export type HarmFile = {
  substanceSlugs?: string[];
  preface?: { title: string; body: string; sourceName: string; sourceUrl: string };
  groups: { id: HarmGroupId; title: string; lead: string }[];
  findings: HarmFinding[];
};

export function loadCovidHarms(): HarmFile {
  const file = path.join(process.cwd(), "data", "covid-harms.json");
  return JSON.parse(readFileSync(file, "utf8")) as HarmFile;
}

export function perMillion(cases: number, n: number): number {
  return (cases / n) * 1_000_000;
}

export function per100k(value: number, per: number): number {
  return (value / per) * 100_000;
}

export function toPerMillion(value: number, per: number): number {
  return (value / per) * 1_000_000;
}

function sourceUnit(per: number): string {
  if (per === 10_000) return "pr. 10.000";
  if (per === 100_000) return "pr. 100.000";
  return "pr. million";
}

function scaled(value: number, digits: number, per: number): { source: string; million: string } {
  const rounded = Number(value.toFixed(digits));
  const factor = 1_000_000 / per;
  const millionDigits = Math.max(0, digits - Math.round(Math.log10(factor)));
  const million = Number((rounded * factor).toFixed(millionDigits));
  return { source: signed(rounded, digits), million: signed(million, millionDigits) };
}

function signed(value: number, digits: number): string {
  if (value < 0) return `minus ${da(Math.abs(value), digits)}`;
  return da(value, digits);
}

function opening(measure: HarmMeasure): string {
  return `Gælder: ${measure.applies}. ${measure.label}`;
}

export function sourceUnitNote(measure: HarmMeasure): string {
  if (measure.kind === "identified" || measure.kind === "share" || measure.kind === "ratio") return "";
  if (!measure.per || measure.per === 1 || measure.per === 1_000_000) return "";
  const digits = measure.digits ?? 0;
  const shown = scaled(measure.value ?? 0, digits, measure.per);
  const band =
    measure.low !== undefined && measure.high !== undefined
      ? ` (${signed(measure.low, digits)} til ${signed(measure.high, digits)})`
      : "";
  return `I kilden: ${shown.source}${band} ${sourceUnit(measure.per)}.`;
}

export function measureText(measure: HarmMeasure): string {
  const label = opening(measure);
  if (measure.kind === "identified" && measure.cases !== undefined && measure.n !== undefined) {
    const rate = measure.statedPerMillion ?? Math.round(perMillion(measure.cases, measure.n));
    return `${label}: ${measure.cases.toLocaleString("da-DK")} af ${measure.n.toLocaleString("da-DK")}, ${rate.toLocaleString("da-DK")} pr. million.`;
  }
  if (measure.kind === "share") {
    return `${label}: ${signed(measure.value ?? 0, measure.digits ?? 0)} %.`;
  }
  const digits = measure.digits ?? 0;
  const value = signed(measure.value ?? 0, digits);
  const band =
    measure.low !== undefined && measure.high !== undefined
      ? ` (${signed(measure.low, digits)} til ${signed(measure.high, digits)})`
      : "";
  if (measure.kind === "ratio" || !measure.per || measure.per === 1) {
    return `${label}: ${value}${band}.`;
  }
  const shown = scaled(measure.value ?? 0, digits, measure.per);
  const shownBand =
    measure.low !== undefined && measure.high !== undefined
      ? ` (${scaled(measure.low, digits, measure.per).million} til ${scaled(measure.high, digits, measure.per).million})`
      : "";
  const ratio = measure.ratio
    ? ` ${measure.ratio.name} ${signed(measure.ratio.value, measure.ratio.digits)} (${signed(measure.ratio.low, measure.ratio.digits)} til ${signed(measure.ratio.high, measure.ratio.digits)}).`
    : "";
  return `${label}: ${shown.million}${shownBand} pr. million.${ratio}`;
}

const BANNED = ["sikker og effektiv", "katastrofe"];

export function harmCopy(file: HarmFile = loadCovidHarms()): string {
  const parts = [
    file.preface?.title ?? "",
    file.preface?.body ?? "",
    ...file.groups.flatMap((group) => [group.title, group.lead]),
    ...file.findings.flatMap((finding) => [
      finding.heading,
      finding.body,
      finding.note ?? "",
      ...finding.measures.flatMap((measure) => [measureText(measure), sourceUnitNote(measure), measure.place, measure.sourceName]),
      ...(finding.links ?? []).map((link) => link.name),
    ]),
  ];
  return parts.join("\n");
}

export function bannedPhrases(text: string): string[] {
  const folded = text.toLocaleLowerCase("da-DK");
  return BANNED.filter((phrase) => folded.includes(phrase));
}
