import raw from "../data/term-links.json" with { type: "json" };

export type TermLinkKind = "direct" | "search";

export type TermAudience = "borger" | "fagperson" | "engelsk";

export type TermLinkRecord = {
  danish: string;
  url: string;
  source: string;
  kind: TermLinkKind;
  verified: boolean;
  pageTitle?: string;
  audience?: TermAudience;
  confidence?: "high" | "medium";
};

export type TermLinksFile = {
  note: string;
  checkedAt: string | null;
  search: {
    label: string;
    urlTemplate: string;
    source: string;
    verified: boolean;
    pageTitle?: string;
  };
  terms: Record<string, TermLinkRecord>;
  socs: Record<string, TermLinkRecord>;
  coverage?: {
    reactionOccurrences: number;
    directOccurrences: number;
    directShare: number;
    directTerms: number;
    mappedTerms: number;
    socWithDirectLink: number;
    socCount: number;
  };
};

export type ResolvedLink = {
  href: string | null;
  danish: string | null;
  source: string | null;
  search: boolean;
  audience: TermAudience | null;
};

export const termLinks = raw as TermLinksFile;

export function resolveMapped(record: TermLinkRecord | undefined, _query: string, _file: TermLinksFile = termLinks): ResolvedLink {
  const danish = record?.danish || null;
  const audience = record?.audience ?? null;
  if (!record?.verified || !record.url) {
    return { href: null, danish, source: record?.source ?? null, search: false, audience };
  }
  if (record.kind === "search") {
    if (record.url.includes("?q=") || !record.url.includes("SearchTerm=")) {
      return { href: null, danish, source: record.source, search: false, audience };
    }
    return { href: record.url, danish, source: record.source, search: true, audience: audience ?? "borger" };
  }
  return { href: record.url, danish, source: record.source, search: false, audience };
}

export function resolveTerm(english: string, file: TermLinksFile = termLinks): ResolvedLink {
  return resolveMapped(file.terms[english], english, file);
}

export function resolveSoc(abbrev: string, label: string, file: TermLinksFile = termLinks): ResolvedLink {
  return resolveMapped(file.socs[abbrev], label, file);
}

export function linkTag(link: ResolvedLink): string | null {
  if (link.audience === "engelsk") return "Engelsk";
  if (link.audience === "fagperson") return "Fagperson";
  if (link.search) return "Søg";
  return null;
}

export function englishSourceNote(link: ResolvedLink): string | null {
  if (link.audience !== "engelsk" || !link.source) return null;
  if (link.source.includes("MedlinePlus")) return "MedlinePlus";
  if (link.source.includes("NHS")) return "NHS";
  return "Engelsk";
}
