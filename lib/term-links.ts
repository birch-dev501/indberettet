import raw from "../data/term-links.json" with { type: "json" };

export type TermLinkKind = "direct" | "search";

export type TermLinkRecord = {
  danish: string;
  url: string;
  source: string;
  kind: TermLinkKind;
  verified: boolean;
  pageTitle?: string;
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
};

export const termLinks = raw as TermLinksFile;

function fallbackSearch(file: TermLinksFile, query: string, danish: string | null): ResolvedLink {
  if (!file.search.verified || !file.search.urlTemplate.includes("{q}")) {
    return { href: null, danish, source: file.search.source, search: true };
  }
  return {
    href: file.search.urlTemplate.replace("{q}", encodeURIComponent(query)),
    danish,
    source: file.search.source,
    search: true,
  };
}

export function resolveMapped(record: TermLinkRecord | undefined, query: string, file: TermLinksFile = termLinks): ResolvedLink {
  const danish = record?.danish || null;
  if (record?.verified && record.kind === "direct" && record.url) {
    return { href: record.url, danish, source: record.source, search: false };
  }
  if (record?.verified && record.kind === "search" && record.url) {
    return { href: record.url, danish, source: record.source, search: true };
  }
  return fallbackSearch(file, danish || query, danish);
}

export function resolveTerm(english: string, file: TermLinksFile = termLinks): ResolvedLink {
  return resolveMapped(file.terms[english], english, file);
}

export function resolveSoc(abbrev: string, label: string, file: TermLinksFile = termLinks): ResolvedLink {
  return resolveMapped(file.socs[abbrev], label, file);
}

export function englishSourceNote(link: ResolvedLink): string | null {
  if (link.search || !link.source) return null;
  if (link.source.includes("MedlinePlus")) return "MedlinePlus";
  if (link.source.includes("NHS")) return "NHS";
  return null;
}
