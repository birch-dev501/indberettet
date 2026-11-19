export const MIN_USERS = 1000;

export const CAUSALITY_NOTE =
  "En indberettet bivirkning er ikke nødvendigvis forårsaget af medicinen. Hændelsen kan skyldes sygdommen selv, anden medicin, et tilfælde eller andre forhold. En indberetning betyder kun, at nogen havde en mistanke om en sammenhæng, og årsagen er ikke fastslået.";

export const RATE_DISCLAIMER = `Dette er en indberetningsrate, ikke en risiko og ikke en hyppighed. ${CAUSALITY_NOTE} De fleste bivirkninger bliver aldrig indberettet (underrapportering). Indberetning svinger med medieomtale, nye lægemidler og kampagner. Én indberetning kan nævne flere lægemidler. Tællingen fra Lægemiddelstatistikregisteret er køb i primærsektoren. Den omfatter ikke sygehusbrug og ikke de fleste vaccinationer. Sammenlign ikke lægemidler direkte ud fra raten.`;

export type UsageFile = {
  ok: boolean;
  fetchedAt: string;
  latestMonth: string | null;
  sourceName: string;
  sourceUrl: string;
  medstatUrl: string;
  register: string;
  byAtc: Record<string, Record<string, number>>;
};

export type RateYear = {
  year: number;
  reports: number;
  users: number;
  per10k: number;
};

export type SubstanceRate = {
  atc: string;
  years: RateYear[];
  reports: number;
  users: number;
  per10k: number;
  latestMonth: string | null;
  sourceName: string;
  sourceUrl: string;
  medstatUrl: string;
  register: string;
};

const LEVEL5 = /^[A-Z]\d{2}[A-Z]{2}\d{2}$/;

export function level5Code(atc: string | null | undefined): string | null {
  const code = (atc ?? "").toUpperCase().replace(/\s+/g, "");
  const stem = code.slice(0, 7);
  return LEVEL5.test(stem) ? stem : null;
}

export function isCompleteYear(year: number, latestMonth: string | null): boolean {
  if (!latestMonth || !/^\d{4}-\d{2}$/.test(latestMonth)) return false;
  const [latestYear, month] = latestMonth.split("-").map(Number);
  if (!latestYear || !month) return false;
  if (year < latestYear) return true;
  return year === latestYear && month === 12;
}

export function per10k(reports: number, users: number): number {
  return (reports / users) * 10000;
}

export function substanceRate(input: {
  atcs: string[];
  reportYears: { year: number; reports: number }[];
  usage: UsageFile | null;
}): SubstanceRate | null {
  const usage = input.usage;
  if (!usage?.ok || !usage.byAtc) return null;
  const codes = [...new Set(input.atcs.map(level5Code).filter((code): code is string => Boolean(code)))];
  if (codes.length !== 1) return null;
  const atc = codes[0];
  if (atc.startsWith("J07")) return null;
  const series = usage.byAtc[atc];
  if (!series) return null;
  const reported = new Map(input.reportYears.map((row) => [row.year, row.reports]));
  if (reported.size === 0) return null;
  const first = Math.min(...reported.keys());
  const last = Math.max(...reported.keys());
  const years: RateYear[] = [];
  for (let year = first; year <= last; year += 1) {
    if (!isCompleteYear(year, usage.latestMonth)) continue;
    const users = series[String(year)];
    if (users == null || users < MIN_USERS) continue;
    const reports = reported.get(year) ?? 0;
    years.push({ year, reports, users, per10k: per10k(reports, users) });
  }
  if (years.length === 0) return null;
  const reports = years.reduce((sum, row) => sum + row.reports, 0);
  const users = years.reduce((sum, row) => sum + row.users, 0);
  if (users < MIN_USERS) return null;
  return {
    atc,
    years,
    reports,
    users,
    per10k: per10k(reports, users),
    latestMonth: usage.latestMonth,
    sourceName: usage.sourceName,
    sourceUrl: usage.sourceUrl,
    medstatUrl: usage.medstatUrl,
    register: usage.register,
  };
}
