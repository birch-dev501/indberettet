import notes from "../data/case-notes.json" with { type: "json" };

export type CaseDrug = {
  name: string;
  generic: string;
  slug: string | null;
};

export type CaseNote = {
  url: string | null;
  firm: string | null;
  summary: string;
  drugs: CaseDrug[];
  search: string[];
  sourceUrl: string;
  sourceName: string;
  year?: number;
};

const cases = notes.cases as CaseNote[];

function foldNote(value: string): string {
  return value
    .toLocaleLowerCase("da-DK")
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function caseNoteFor(url: string): CaseNote | null {
  return cases.find((item) => item.url === url) ?? null;
}

export function caseNotes(): CaseNote[] {
  return cases;
}

export function caseAnchor(url: string): string {
  const slug = url.split("/").filter(Boolean).pop() ?? "sag";
  const clean = slug.replace(/^[^a-z0-9]+/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `sag-${clean || "sag"}`;
}

export function caseMatches(parts: string[], query: string): boolean {
  const needle = foldNote(query.trim());
  if (!needle) return false;
  return foldNote(parts.join(" ")).includes(needle);
}
