import { buildCompanyCatalog, companySearchRecords, normalizeHolder } from "./companies.ts";

export type AliasKind = "substance" | "brand" | "holder" | "synonym";

export type SubstanceRecord = {
  slug: string;
  name: string;
  reports: number;
  showcase: boolean;
  brands?: string[];
  brandCount?: number;
  companies?: string[];
};

export type AliasRecord = {
  slug: string;
  text: string;
  kind: AliasKind;
};

export type ClassTerm = {
  terms: string[];
  atcPrefixes: string[];
  label: string;
};

export type SearchGap = {
  id: string;
  terms: string[];
  requireAny: string[];
  title: string;
  explanation: string;
};

export type ReviewedSynonyms = {
  slugTerms?: { slugs: string[]; terms: string[]; label: string }[];
  classTerms?: ClassTerm[];
  gaps?: SearchGap[];
};

export type ProductRecord = {
  name: string;
  holder: string;
  atc: string;
  slugs: string[];
};

export type CategorySearchRecord = {
  slug: string;
  name: string;
  terms: string[];
  reports: number;
  members: number;
};

export type DiseaseSearchRecord = {
  slug: string;
  name: string;
  terms: string[];
  atcPrefixes: string[];
};

export type SearchIndex = {
  substances: SubstanceRecord[];
  aliases: AliasRecord[];
  classes: ClassTerm[];
  categories: CategorySearchRecord[];
  diseases: DiseaseSearchRecord[];
  companies: CompanySearchRecord[];
  atcBySlug: Record<string, string[]>;
  gaps: SearchGap[];
};

export type CompanySearchRecord = {
  slug: string;
  name: string;
  terms: string[];
};

export type SearchHit = {
  slug: string | null;
  name: string;
  reports: number | null;
  score: number;
  reason: string;
  kind?: "substance" | "category" | "disease" | "company";
  brands?: string[];
  brandCount?: number;
  companies?: string[];
  unavailable?: boolean;
  explanation?: string;
};

export function fold(value: string): string {
  return value
    .toLocaleLowerCase("da-DK")
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function tokenize(value: string): string[] {
  return fold(value)
    .split(/[^a-z0-9&+-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function maxEdits(length: number): number {
  if (length >= 8) return 2;
  if (length >= 5) return 1;
  return 0;
}

export function editDistance(left: string, right: string, limit: number): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowBest = current[0];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      if (current[j] < rowBest) rowBest = current[j];
    }
    if (rowBest > limit) return limit + 1;
    previous = current;
  }
  return previous[right.length];
}

function tokenScore(token: string, alias: string): number {
  if (!token || !alias) return 0;
  if (token === alias) return 100;
  const limit = maxEdits(Math.max(token.length, alias.length));
  if (token.length >= 4 && alias.startsWith(token)) return 78;
  if (alias.length >= 5 && token.startsWith(alias) && token.length - alias.length <= 3) return 72;
  if (limit === 0) return 0;
  const distance = editDistance(token, alias, limit);
  if (distance > limit) return 0;
  return 64 - distance * 18;
}

function kindBonus(kind: AliasKind): number {
  if (kind === "substance") return 24;
  if (kind === "brand") return 18;
  if (kind === "synonym") return 12;
  return 6;
}

function phraseHit(query: string, term: string): boolean {
  const folded = fold(term).replace(/[^a-z0-9&+-]+/g, " ").trim();
  if (!folded) return false;
  return ` ${query} `.includes(` ${folded} `);
}

function termHitsQuery(tokens: string[], query: string, term: string): boolean {
  if (phraseHit(query, term)) return true;
  const parts = tokenize(term);
  if (parts.length === 0) return false;
  return parts.every((part) => tokens.some((token) => tokenScore(token, part) >= 64));
}

export function searchCatalog(index: SearchIndex, rawQuery: string, limit = 8): { hits: SearchHit[]; suggestions: string[] } {
  const query = fold(rawQuery).replace(/[^a-z0-9&+-]+/g, " ").replace(/\s+/g, " ").trim();
  const tokens = tokenize(rawQuery);
  if (query.length < 2) return { hits: [], suggestions: [] };

  const bySlug = new Map(index.substances.map((item) => [item.slug, item]));
  const gaps: SearchHit[] = [];
  for (const gap of index.gaps) {
    const triggered = gap.terms.some((term) => termHitsQuery(tokens, query, term));
    if (!triggered) continue;
    if (gap.requireAny.length > 0 && !gap.requireAny.some((term) => termHitsQuery(tokens, query, term))) continue;
    gaps.push({
      slug: null,
      name: gap.title,
      reports: null,
      score: 1000,
      reason: gap.title,
      unavailable: true,
      explanation: gap.explanation,
    });
  }

  const diseaseTokens = new Set<string>();
  for (const disease of index.diseases ?? []) {
    for (const term of disease.terms) {
      if (!(phraseHit(query, term) || fold(term) === query)) continue;
      for (const part of tokenize(term)) diseaseTokens.add(part);
    }
  }
  const tokenKnown = tokens.map(
    (token) =>
      aliasKnown(index, token) ||
      classKnown(index, token) ||
      categoryKnown(index, token) ||
      companyKnown(index, token) ||
      diseaseTokens.has(token),
  );
  const activeTokens = tokens.filter((_, index) => tokenKnown[index]);
  if (activeTokens.length === 0) {
    return { hits: gaps, suggestions: gaps.length ? [] : suggest(index, tokens) };
  }

  const scores = new Map<string, { score: number; matched: number; reason: string; reasonScore: number }>();
  const ensure = (slug: string) => {
    const current = scores.get(slug);
    if (current) return current;
    const created = { score: 0, matched: 0, reason: "", reasonScore: 0 };
    scores.set(slug, created);
    return created;
  };

  for (const token of activeTokens) {
    const bestBySlug = new Map<string, { score: number; reason: string }>();
    for (const alias of index.aliases) {
      const folded = fold(alias.text);
      const direct = tokenScore(token, folded);
      const wordScores = tokenize(alias.text).map((part) => {
        const partScore = tokenScore(token, part);
        return partScore >= 72 ? partScore : 0;
      });
      let score = Math.max(direct, ...wordScores, 0);
      if (score === 0) continue;
      if (folded === token) score += 40;
      const total = score + kindBonus(alias.kind);
      const previous = bestBySlug.get(alias.slug);
      if (!previous || total > previous.score) {
        const substance = bySlug.get(alias.slug);
        bestBySlug.set(alias.slug, {
          score: total,
          reason: `${alias.text} → ${substance?.name ?? alias.slug}`,
        });
      }
    }
    for (const group of index.classes) {
      const matchedTerm = group.terms.find((term) => termHitsQuery([token], token, term));
      if (!matchedTerm) continue;
      for (const [slug, codes] of Object.entries(index.atcBySlug)) {
        if (!codes.some((code) => group.atcPrefixes.some((prefix) => code.startsWith(prefix)))) continue;
        const substance = bySlug.get(slug);
        const total = 70;
        const previous = bestBySlug.get(slug);
        if (!previous || total > previous.score) {
          bestBySlug.set(slug, { score: total, reason: `${matchedTerm} → ${substance?.name ?? slug}` });
        }
      }
    }
    for (const [slug, hit] of bestBySlug) {
      const bucket = ensure(slug);
      bucket.score += hit.score;
      bucket.matched += 1;
      if (hit.score > bucket.reasonScore) {
        bucket.reasonScore = hit.score;
        bucket.reason = hit.reason;
      }
    }
  }

  const substanceHits = [...scores.entries()]
    .filter(([, value]) => value.matched === activeTokens.length)
    .map(([slug, value]) => {
      const substance = bySlug.get(slug);
      return {
        slug,
        name: substance?.name ?? slug,
        reports: substance?.reports ?? null,
        kind: "substance",
        brands: substance?.brands,
        brandCount: substance?.brandCount,
        companies: substance?.companies,
        score: value.score + value.matched * 20 + Math.min(substance?.reports ?? 0, 5000) / 1000,
        reason: value.reason,
      } satisfies SearchHit;
    });

  const categoryHits: SearchHit[] = [];
  for (const category of index.categories ?? []) {
    let matched = 0;
    let score = 0;
    let reason = "";
    for (const token of activeTokens) {
      const term = category.terms.find((item) => termHitsQuery([token], token, item));
      if (!term) continue;
      matched += 1;
      const exact = fold(term) === token;
      score += exact ? 140 : 80;
      if (!reason || exact) reason = `${term} → ${category.name}`;
    }
    if (matched !== activeTokens.length) continue;
    categoryHits.push({
      slug: category.slug,
      name: category.name,
      reports: category.reports,
      kind: "category",
      score: score + 500,
      reason,
    });
  }

  const companyHits: SearchHit[] = [];
  for (const company of index.companies ?? []) {
    const matched = companyMatchScore(query, tokens, company);
    if (matched === 0) continue;
    companyHits.push({
      slug: company.slug,
      name: company.name,
      reports: null,
      kind: "company",
      score: matched,
      reason: `Firma · ${company.name}`,
    });
  }

  const diseaseHits: SearchHit[] = [];
  const diseaseSubstances = new Map<string, SearchHit>();
  for (const disease of index.diseases ?? []) {
    const term = disease.terms.find((item) => phraseHit(query, item) || fold(item) === query);
    if (!term) continue;
    diseaseHits.push({
      slug: disease.slug,
      name: disease.name,
      reports: null,
      kind: "disease",
      score: 1700,
      reason: `${term} → ${disease.name}`,
    });
    for (const [slug, codes] of Object.entries(index.atcBySlug)) {
      if (!codes.some((code) => disease.atcPrefixes.some((prefix) => code.startsWith(prefix)))) continue;
      const substance = bySlug.get(slug);
      if (!substance) continue;
      diseaseSubstances.set(slug, {
        slug,
        name: substance.name,
        reports: substance.reports,
        kind: "substance",
        brands: substance.brands,
        brandCount: substance.brandCount,
        companies: substance.companies,
        score: 80,
        reason: `${term} → ${disease.name}`,
      });
    }
  }
  const merged = new Map<string, SearchHit>();
  for (const hit of [...substanceHits, ...diseaseSubstances.values()]) {
    const key = `${hit.kind}:${hit.slug}`;
    const previous = merged.get(key);
    if (!previous || hit.score > previous.score) merged.set(key, hit);
  }
  const ranked = [...companyHits, ...diseaseHits, ...categoryHits, ...merged.values()].sort(
    (a, b) => b.score - a.score || (b.reports ?? 0) - (a.reports ?? 0) || a.name.localeCompare(b.name, "da"),
  );

  const hits = [...gaps, ...ranked].slice(0, limit);
  return { hits, suggestions: hits.length === 0 ? suggest(index, tokens) : [] };
}

function aliasKnown(index: SearchIndex, token: string): boolean {
  return index.aliases.some((alias) => {
    const folded = fold(alias.text);
    return tokenScore(token, folded) > 0 || tokenize(alias.text).some((part) => tokenScore(token, part) > 0);
  });
}

function classKnown(index: SearchIndex, token: string): boolean {
  return index.classes.some((group) => group.terms.some((term) => termHitsQuery([token], token, term)));
}

function companyPool(company: CompanySearchRecord): string[] {
  return [...new Set([company.name, ...company.terms].flatMap((term) => tokenize(term)))];
}

function companyKnown(index: SearchIndex, token: string): boolean {
  return (index.companies ?? []).some((company) => companyTokenScore(token, companyPool(company)) > 0);
}

function companyTokenScore(token: string, parts: string[]): number {
  let best = 0;
  for (const part of parts) {
    best = Math.max(best, tokenScore(token, part));
    if (token.length >= 4 && part.length >= 4 && editDistance(token, part, 1) <= 1) best = Math.max(best, 70);
  }
  return best;
}

function companyMatchScore(query: string, tokens: string[], company: CompanySearchRecord): number {
  const name = fold(company.name);
  const nameTokens = tokenize(company.name);
  const parts = companyPool(company);
  if (!name || tokens.length === 0) return 0;
  if (name === query) return 170;
  if (tokens.length === 1) {
    const token = tokens[0];
    const singles = [company.name, ...company.terms].flatMap((term) => {
      const words = tokenize(term);
      return words.length === 1 ? words : [];
    });
    if (token.length >= 3 && (nameTokens.includes(token) || singles.includes(token))) return 160;
    if (token.length >= 4 && name.startsWith(`${token} `)) return 150;
    const fuzzy = companyTokenScore(token, nameTokens);
    return fuzzy >= 70 ? 140 : 0;
  }
  const matched = tokens.every((token) => companyTokenScore(token, parts) >= 64);
  return matched ? 400 : 0;
}

function categoryKnown(index: SearchIndex, token: string): boolean {
  return (index.categories ?? []).some((category) =>
    category.terms.some((term) => termHitsQuery([token], token, term)),
  );
}

function suggest(index: SearchIndex, tokens: string[]): string[] {
  const names = new Map(index.substances.map((item) => [item.slug, item.name]));
  const found: { name: string; distance: number }[] = [];
  for (const token of tokens) {
    if (token.length < 4) continue;
    for (const alias of index.aliases) {
      if (alias.kind === "holder") continue;
      const candidate = fold(alias.text);
      if (candidate.length < 5 || Math.abs(candidate.length - token.length) > 2) continue;
      const distance = editDistance(token, candidate, 2);
      if (distance > 0 && distance <= 2) found.push({ name: names.get(alias.slug) ?? alias.text, distance });
    }
  }
  return [...new Map(found.sort((a, b) => a.distance - b.distance).map((item) => [item.name, item])).keys()].slice(0, 3);
}

const GENERIC_BRAND = new Set([
  "covid-19",
  "covid",
  "vaccine",
  "vaccines",
  "vaccin",
  "human",
  "insulin",
  "tablet",
  "solution",
  "injection",
  "nos",
  "forte",
  "comp",
  "original",
]);

function pushAlias(target: AliasRecord[], seen: Set<string>, slug: string, text: string, kind: AliasKind) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const folded = fold(cleaned);
  if (folded.length < 3 || GENERIC_BRAND.has(folded)) return;
  const key = `${slug}|${kind}|${folded}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push({ slug, text: cleaned, kind });
}

export function buildSearchIndex(input: {
  substances: SubstanceRecord[];
  products: ProductRecord[];
  reviewed: ReviewedSynonyms;
  overviewNames?: { slug: string; names: string[] }[];
  categories?: CategorySearchRecord[];
  diseases?: DiseaseSearchRecord[];
  labels?: { slug: string; text: string }[];
}): SearchIndex {
  const known = new Set(input.substances.map((item) => item.slug));
  const aliases: AliasRecord[] = [];
  const seen = new Set<string>();
  const atcBySlug: Record<string, Set<string>> = {};

  for (const substance of input.substances) {
    pushAlias(aliases, seen, substance.slug, substance.name, "substance");
    const compact = substance.name.trim();
    if (/e$/i.test(compact) && compact.length > 6) pushAlias(aliases, seen, substance.slug, compact.slice(0, -1), "substance");
    if (/um$/i.test(compact) && compact.length > 8) pushAlias(aliases, seen, substance.slug, compact.slice(0, -2), "substance");
  }

  for (const product of input.products) {
    const linked = product.slugs.filter((slug) => known.has(slug));
    const holderLabel = product.holder ? normalizeHolder(product.holder).label : "";
    for (const slug of linked) {
      pushAlias(aliases, seen, slug, product.name, "brand");
      const first = product.name.split(/\s+/)[0] ?? "";
      if (first && first !== product.name && linked.length === 1) pushAlias(aliases, seen, slug, first, "brand");
      if (holderLabel) pushAlias(aliases, seen, slug, holderLabel, "holder");
      if (product.atc) {
        atcBySlug[slug] ??= new Set();
        atcBySlug[slug].add(product.atc.toUpperCase());
      }
    }
  }

  for (const overview of input.overviewNames ?? []) {
    if (!known.has(overview.slug)) continue;
    for (const name of overview.names) {
      pushAlias(aliases, seen, overview.slug, name, "brand");
      const first = name.split(/\s+/)[0] ?? "";
      if (first) pushAlias(aliases, seen, overview.slug, first, "brand");
    }
  }

  for (const label of input.labels ?? []) {
    if (!known.has(label.slug) || !label.text.trim()) continue;
    pushAlias(aliases, seen, label.slug, label.text, "synonym");
  }

  for (const group of input.reviewed.slugTerms ?? []) {
    for (const slug of group.slugs) {
      if (!known.has(slug)) continue;
      for (const term of group.terms) pushAlias(aliases, seen, slug, term, "synonym");
    }
  }

  if (known.has("covid-19-vaccines")) {
    atcBySlug["covid-19-vaccines"] ??= new Set();
    atcBySlug["covid-19-vaccines"].add("J07BN01");
  }

  const categories = (input.categories ?? []).map((category) => ({
    ...category,
    terms: [...new Set([category.name, ...category.terms])],
  }));

  const catalog = buildCompanyCatalog(
    input.products,
    input.substances.map((item) => ({
      slug: item.slug,
      name: item.name,
      reports: item.reports,
      seriousReports: 0,
      fatalReports: 0,
    })),
    input.overviewNames ?? [],
  );
  const substances = input.substances.map((item) => {
    const identity = catalog.bySlug[item.slug];
    return {
      ...item,
      brands: identity?.brands.slice(0, 3) ?? [],
      brandCount: identity?.brandCount ?? 0,
      companies: identity?.companies.slice(0, 2).map((company) => company.label) ?? [],
    };
  });

  return {
    substances,
    aliases,
    classes: input.reviewed.classTerms ?? [],
    categories,
    diseases: input.diseases ?? [],
    companies: companySearchRecords(catalog.companies),
    atcBySlug: Object.fromEntries([...Object.entries(atcBySlug)].map(([slug, codes]) => [slug, [...codes]])),
    gaps: input.reviewed.gaps ?? [],
  };
}
