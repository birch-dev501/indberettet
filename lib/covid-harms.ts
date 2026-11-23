import { readFileSync } from "fs";
import path from "path";
import { da } from "./sources.ts";

export type HarmGroupId = "established" | "signal" | "unsupported";

export type HarmRatio = { name: string; value: number; low: number; high: number; digits: number };

export type HarmMeasure = {
  id: string;
  label: string;
  value?: number;
  low?: number;
  high?: number;
  digits?: number;
  per?: number;
  kind: "excess" | "rate" | "identified" | "ratio";
  cases?: number;
  n?: number;
  statedPerMillion?: number;
  ratio?: HarmRatio;
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
  measures: HarmMeasure[];
  links?: HarmLink[];
};

export type HarmFile = {
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

function signed(value: number, digits: number): string {
  if (value < 0) return `minus ${da(Math.abs(value), digits)}`;
  return da(value, digits);
}

export function measureText(measure: HarmMeasure): string {
  if (measure.kind === "identified" && measure.cases !== undefined && measure.n !== undefined) {
    const rate = measure.statedPerMillion ?? Math.round(perMillion(measure.cases, measure.n));
    return `${measure.label}: ${measure.cases.toLocaleString("da-DK")} af ${measure.n.toLocaleString("da-DK")}, ${rate.toLocaleString("da-DK")} pr. million.`;
  }
  const digits = measure.digits ?? 0;
  const value = signed(measure.value ?? 0, digits);
  const band =
    measure.low !== undefined && measure.high !== undefined
      ? ` (${signed(measure.low, digits)} til ${signed(measure.high, digits)})`
      : "";
  const unit =
    measure.kind === "ratio" ? "" : measure.per === 10000 ? " pr. 10.000" : measure.per === 1_000_000 ? " pr. million" : " pr. 100.000";
  const ratio = measure.ratio
    ? ` ${measure.ratio.name} ${signed(measure.ratio.value, measure.ratio.digits)} (${signed(measure.ratio.low, measure.ratio.digits)} til ${signed(measure.ratio.high, measure.ratio.digits)}).`
    : "";
  return `${measure.label}: ${value}${band}${unit}.${ratio}`;
}

const BANNED = ["sikker og effektiv", "katastrofe"];

export function harmCopy(file: HarmFile = loadCovidHarms()): string {
  const parts = [
    ...file.groups.flatMap((group) => [group.title, group.lead]),
    ...file.findings.flatMap((finding) => [
      finding.heading,
      finding.body,
      ...finding.measures.flatMap((measure) => [measureText(measure), measure.place, measure.sourceName]),
      ...(finding.links ?? []).map((link) => link.name),
    ]),
  ];
  return parts.join("\n");
}

export function bannedPhrases(text: string): string[] {
  const folded = text.toLocaleLowerCase("da-DK");
  return BANNED.filter((phrase) => folded.includes(phrase));
}
