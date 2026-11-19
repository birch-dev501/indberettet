export const SUBSTANCE_COUNT_NOTE =
  "Indberetningerne er talt for det aktive stof, ikke for det enkelte handelsnavn eller firma. Den åbne oversigt fra Lægemiddelstyrelsen fordeler ikke tallene på præparaterne.";

const LEGAL = new Set([
  "as", "aps", "ab", "bv", "gmbh", "sa", "sl", "slu", "ltd", "limited", "inc", "eeig", "nv", "sas",
  "ag", "se", "ks", "srl", "dd", "doo", "spa", "oy", "plc", "corp", "corporation", "llc", "lp", "hf",
  "ehf", "sro", "mbh", "kg", "ohg", "sarl", "pte", "pty", "co", "company", "unlimited",
]);

const PLACE = new Set([
  "nederland", "netherlands", "netherland", "danmark", "denmark", "ireland", "sverige", "sweden",
  "norge", "norway", "finland", "germany", "deutschland", "france", "spain", "italia", "italy",
  "austria", "belgium", "belgien", "hellas", "greece", "poland", "portugal", "switzerland", "schweiz",
  "iceland", "mesto", "branch", "europe", "european", "norden",
]);

const SKIP = new Set(["and", "und", "og", "of", "the", "int", "ma"]);

const TRAILING = new Set([
  "arzneimittel", "pharma", "pharmaceutical", "pharmaceuticals", "healthcare", "generics",
  "international", "europharm", "registration", "animal", "health", "nordic", "nordics", "veterinary",
  "products", "regulatory", "invest", "trading", "services", "biologicals", "vetmedica", "industrie",
  "manufacturing", "pharmaceuticals", "tovarna", "zdravil",
]);

const FORM_WORDS =
  /\b(film-coated|filmovertrukne|filmovertrukken|tablets?|tabletter|kapsler|kapsel|capsules?|injection|injektionsvæske|injektionsvaeske|infusion|cream|creme|ointment|salve|oral|solution|suspension|powder|pulver|syrup|saft|spray|plaster|suppository|suppositorier|granules|granulat)\b/gi;

export type CompanyRef = { slug: string; label: string };

export type SubstanceIdentity = {
  brands: string[];
  brandCount: number;
  companies: CompanyRef[];
};

export type CompanySubstance = {
  slug: string;
  name: string;
  reports: number;
  seriousReports: number;
  fatalReports: number;
  brands: string[];
  brandCount: number;
};

export type CompanyPage = {
  slug: string;
  label: string;
  variants: string[];
  note?: string;
  searchTerms?: string[];
  productRows: number;
  substances: CompanySubstance[];
  otherProductNames: string[];
  otherProductCount: number;
};

export type CompanyCatalog = {
  bySlug: Record<string, SubstanceIdentity>;
  companies: CompanyPage[];
};

type ProductRow = { name: string; holder: string; slugs: string[] };
type SubstanceRow = { slug: string; name: string; reports: number; seriousReports: number; fatalReports: number };

function fold(value: string): string {
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

function tokenKey(token: string): string {
  return fold(token).replace(/[./&]+/g, "");
}

function rawTokens(value: string): string[] {
  return value
    .replace(/\([^)]*\)/g, " ")
    .split(/[\s,;/]+/)
    .map((token) => token.trim())
    .filter((token) => token && token !== "&");
}

type HolderFamily = { key: string; label: string; slug: string; note: string; terms: string[] };

const MSD_NOTE =
  "MSD er Merck Sharp & Dohme, det amerikanske Merck & Co. Uden for USA og Canada hedder selskabet MSD, så det ikke forveksles med det tyske Merck.";

const MERCK_KGAA_NOTE =
  "Dette er det tyske Merck (Merck KGaA), som også står som Merck Europe, Merck A/S og Merck Serono. Det er ikke det samme som MSD, det amerikanske Merck Sharp & Dohme.";

function holderFamily(holder: string): HolderFamily | null {
  const folded = fold(holder);
  const sharp = folded.includes("sharp") && folded.includes("dohme");
  const msd = /(^|[^a-z])msd([^a-z]|$)/.test(folded);
  if (sharp || msd) {
    return {
      key: "msdmercksharpdohme",
      label: "MSD (Merck Sharp & Dohme)",
      slug: "msd",
      note: MSD_NOTE,
      terms: ["MSD", "Merck Sharp & Dohme", "Merck Sharp Dohme", "Merck & Co"],
    };
  }
  if (folded.includes("serono") || (folded.includes("merck") && !sharp && !msd)) {
    return {
      key: "merckkgaa",
      label: "Merck (Merck KGaA)",
      slug: "merck",
      note: MERCK_KGAA_NOTE,
      terms: ["Merck", "Merck KGaA", "Merck Serono", "Merck Europe", "Serono"],
    };
  }
  return null;
}

export function normalizeHolder(holder: string): { key: string; label: string } {
  const family = holderFamily(holder);
  if (family) return { key: family.key, label: family.label };
  const tokens = rawTokens(holder);
  const keys = tokens.map(tokenKey);
  const kept: number[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const key = keys[index];
    if (!key || LEGAL.has(key) || PLACE.has(key) || SKIP.has(key)) continue;
    if (index > 0 && key === "novo") continue;
    if (key.length < 2 && index > 0) continue;
    kept.push(index);
  }
  while (kept.length > 1 && TRAILING.has(keys[kept[kept.length - 1]])) kept.pop();
  const label = kept
    .map((index) => tokens[index].replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const key = fold(label).replace(/[^a-z0-9]+/g, "");
  return { key: key || fold(holder).replace(/[^a-z0-9]+/g, "") || "firma", label: label || holder.trim() };
}

export function companySlug(label: string): string {
  const slug = fold(label)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "firma";
}

function titleCaseIfShouting(value: string): string {
  const letters = value.replace(/[^A-Za-zÆØÅæøå]/g, "");
  if (!letters || letters !== letters.toUpperCase()) return value;
  return value.toLocaleLowerCase("da-DK").replace(/(^|[\s/"-])([a-zæøå])/g, (match, lead: string, letter: string) => {
    return lead + letter.toLocaleUpperCase("da-DK");
  });
}

export function brandLabel(name: string): string {
  const quoted = [...name.matchAll(/"([^"]+)"/g)]
    .map((match) => {
      const tokens = rawTokens(match[1]).filter((token) => {
        const key = tokenKey(token);
        return key && !LEGAL.has(key) && !PLACE.has(key);
      });
      return tokens.join(" ").trim();
    })
    .filter(Boolean);
  let base = name.replace(/"[^"]*"/g, " ");
  base = base.replace(/\b\d+(?:[.,]\d+)?(?:\s*[/+]\s*\d+(?:[.,]\d+)?)*\s*(?:mg|g|ml|mikrogram|mikrog|µg|mcg|iu|ie|%)\b/gi, " ");
  base = base.replace(FORM_WORDS, " ");
  base = base.replace(/\s+/g, " ").trim();
  const label = titleCaseIfShouting([base, ...quoted].filter(Boolean).join(" ").replace(/\s+/g, " ").trim());
  return label;
}

type BrandAcc = { label: string; count: number; combo: boolean; overview: boolean };

function considerBrand(bucket: Map<string, BrandAcc>, name: string, combo: boolean, overview: boolean) {
  const label = brandLabel(name);
  const key = fold(label).replace(/[^a-z0-9]+/g, "");
  if (key.length < 3) return;
  const current = bucket.get(key);
  if (!current) {
    bucket.set(key, { label, count: 1, combo, overview });
    return;
  }
  if (overview && !current.overview) return;
  current.count += 1;
  if (!combo) current.combo = false;
  if (!overview) current.overview = false;
  if (!overview && current.label !== label && /[a-zæøå]/.test(label)) current.label = label;
}

export function identitiesFor(
  products: ProductRow[],
  substances: { slug: string; name: string }[],
  overviewNames: { slug: string; names: string[] }[] = [],
): Record<string, SubstanceIdentity> {
  const names = new Map(substances.map((item) => [item.slug, fold(item.name).replace(/[^a-z0-9]+/g, "")]));
  const buckets = new Map<string, Map<string, BrandAcc>>();
  const holders = new Map<string, Map<string, { label: string; count: number }>>();
  const ensure = (slug: string) => {
    if (!buckets.has(slug)) buckets.set(slug, new Map());
    if (!holders.has(slug)) holders.set(slug, new Map());
  };

  for (const product of products) {
    const holder = product.holder?.trim();
    const company = holder ? normalizeHolder(holder) : null;
    for (const slug of product.slugs) {
      ensure(slug);
      if (product.name) considerBrand(buckets.get(slug)!, product.name, product.slugs.length > 1, false);
      if (company?.key) {
        const group = holders.get(slug)!;
        const current = group.get(company.key) ?? { label: company.label, count: 0 };
        current.count += 1;
        if (company.label.length < current.label.length) current.label = company.label;
        group.set(company.key, current);
      }
    }
  }

  for (const overview of overviewNames) {
    ensure(overview.slug);
    const bucket = buckets.get(overview.slug)!;
    for (const name of overview.names) considerBrand(bucket, name, false, true);
  }

  const companySlugs = new Map<string, string>();
  const allocate = (key: string, label: string) => {
    const existing = companySlugs.get(key);
    if (existing) return existing;
    let slug = companySlug(label);
    const taken = new Set(companySlugs.values());
    let n = 2;
    while (taken.has(slug)) slug = `${companySlug(label)}-${n++}`;
    companySlugs.set(key, slug);
    return slug;
  };

  const result: Record<string, SubstanceIdentity> = {};
  for (const substance of substances) {
    const own = names.get(substance.slug) ?? "";
    const ranked = [...(buckets.get(substance.slug)?.values() ?? [])]
      .filter((brand) => fold(brand.label).replace(/[^a-z0-9]+/g, "") !== own)
      .sort((a, b) => Number(a.combo) - Number(b.combo) || Number(a.overview) - Number(b.overview) || b.count - a.count || a.label.localeCompare(b.label, "da"));
    const mentions = ranked.filter((brand) => !brand.combo && fold(brand.label).includes(fold(substance.name).split(" ")[0] ?? ""));
    const others = ranked.filter((brand) => !brand.combo && !mentions.includes(brand));
    const rest = ranked.filter((brand) => brand.combo || (!mentions.includes(brand) && !others.includes(brand)));
    const ordered = [...mentions, ...others, ...rest];
    const compact = mentions.slice(0, 3);
    const leadOther = others[0];
    if (leadOther && leadOther.count > (compact[2]?.count ?? 0)) {
      if (compact.length >= 3) compact.splice(2, 1, leadOther);
      else compact.push(leadOther);
    }
    for (const brand of ordered) {
      if (compact.length >= 3) break;
      if (!compact.includes(brand)) compact.push(brand);
    }
    const brands = [...compact, ...ordered.filter((brand) => !compact.includes(brand))];
    const companies = [...(holders.get(substance.slug)?.entries() ?? [])]
      .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label, "da"))
      .map(([key, value]) => ({ slug: allocate(key, value.label), label: value.label }));
    result[substance.slug] = {
      brands: brands.slice(0, 24).map((brand) => brand.label),
      brandCount: ranked.length,
      companies,
    };
  }
  return result;
}

export function buildCompanyCatalog(
  products: ProductRow[],
  substances: SubstanceRow[],
  overviewNames: { slug: string; names: string[] }[] = [],
): CompanyCatalog {
  const identities = identitiesFor(products, substances, overviewNames);
  const known = new Set(substances.map((item) => item.slug));
  const byKey = new Map<string, CompanyPage & { key: string }>();
  const ownBrands = new Map<string, Map<string, Map<string, { label: string; count: number }>>>();

  for (const product of products) {
    if (!product.holder?.trim()) continue;
    const company = normalizeHolder(product.holder);
    if (!company.key) continue;
    const page = byKey.get(company.key) ?? {
      key: company.key,
      slug: "",
      label: company.label,
      variants: [],
      productRows: 0,
      substances: [],
      otherProductNames: [],
      otherProductCount: 0,
    };
    page.productRows += 1;
    if (company.label.length < page.label.length) page.label = company.label;
    if (!page.variants.includes(product.holder) && page.variants.length < 8) page.variants.push(product.holder);
    const linked = product.slugs.filter((slug) => known.has(slug));
    if (linked.length === 0) {
      page.otherProductCount += 1;
      if (product.name && !page.otherProductNames.includes(product.name) && page.otherProductNames.length < 8) {
        page.otherProductNames.push(product.name);
      }
    } else if (product.name) {
      const label = brandLabel(product.name);
      const brandKey = fold(label).replace(/[^a-z0-9]+/g, "");
      if (brandKey.length >= 3) {
        const perCompany = ownBrands.get(company.key) ?? new Map<string, Map<string, { label: string; count: number }>>();
        for (const slug of linked) {
          const perSlug = perCompany.get(slug) ?? new Map<string, { label: string; count: number }>();
          const current = perSlug.get(brandKey) ?? { label, count: 0 };
          current.count += 1;
          perSlug.set(brandKey, current);
          perCompany.set(slug, perSlug);
        }
        ownBrands.set(company.key, perCompany);
      }
    }
    byKey.set(company.key, page);
  }

  const used = new Set<string>();
  for (const page of byKey.values()) {
    let slug = companySlug(page.label);
    let n = 2;
    while (used.has(slug)) slug = `${companySlug(page.label)}-${n++}`;
    used.add(slug);
    page.slug = slug;
    const family = holderFamily(page.label);
    if (family) {
      page.slug = family.slug;
      page.note = family.note;
      page.searchTerms = family.terms;
    }
    const substanceSlugs = new Set<string>();
    for (const [slugKey, identity] of Object.entries(identities)) {
      if (identity.companies.some((item) => item.slug === slug || normalizeHolder(item.label).key === page.key)) {
        substanceSlugs.add(slugKey);
      }
    }
    const owned = ownBrands.get(page.key);
    page.substances = substances
      .filter((item) => substanceSlugs.has(item.slug))
      .map((item) => {
        const mine = [...(owned?.get(item.slug)?.values() ?? [])].sort(
          (a, b) => b.count - a.count || a.label.localeCompare(b.label, "da"),
        );
        return {
          slug: item.slug,
          name: item.name,
          reports: item.reports,
          seriousReports: item.seriousReports,
          fatalReports: item.fatalReports,
          brands: mine.length > 0 ? mine.slice(0, 3).map((brand) => brand.label) : identities[item.slug]?.brands.slice(0, 3) ?? [],
          brandCount: mine.length > 0 ? mine.length : identities[item.slug]?.brandCount ?? 0,
        };
      })
      .sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name, "da"));
  }

  const companies = [...byKey.values()]
    .map((page) => {
      const { key, ...rest } = page;
      return { ...rest, slug: rest.slug || companySlug(key) };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "da"));

  const slugByKey = new Map([...byKey.values()].map((page) => [page.key, page.slug]));
  const bySlug: Record<string, SubstanceIdentity> = {};
  for (const [slug, identity] of Object.entries(identities)) {
    bySlug[slug] = {
      ...identity,
      companies: identity.companies.map((company) => ({
        ...company,
        slug: slugByKey.get(normalizeHolder(company.label).key) ?? company.slug,
      })),
    };
  }

  return { bySlug, companies };
}

export function companySearchRecords(companies: CompanyPage[]): { slug: string; name: string; terms: string[] }[] {
  return companies.map((company) => ({
    slug: company.slug,
    name: company.label,
    terms: [...new Set([company.label, ...company.variants, ...(company.searchTerms ?? [])])],
  }));
}
