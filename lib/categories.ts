export type CategoryDefinition = {
  slug: string;
  name: string;
  atc: string;
  officialName: string;
  description: string;
  terms: string[];
  order: number;
};

export type CategoryMember = {
  slug: string;
  name: string;
  reports: number;
  seriousReports: number;
  fatalReports: number;
};

export type CategoryGroup = CategoryDefinition & {
  members: CategoryMember[];
  reports: number;
  seriousReports: number;
  fatalReports: number;
};

type SubstanceCounts = {
  slug: string;
  name: string;
  reports: number;
  seriousReports: number;
  fatalReports: number;
};

type ProductAtc = {
  atc: string;
  slugs: string[];
};

export function assignCategories(
  definitions: CategoryDefinition[],
  substances: SubstanceCounts[],
  products: ProductAtc[],
): CategoryGroup[] {
  const bySlug = new Map(substances.map((item) => [item.slug, item]));
  const codesBySlug = new Map<string, Set<string>>();
  for (const product of products) {
    const code = product.atc?.toUpperCase() ?? "";
    if (code.length < 3) continue;
    for (const slug of product.slugs) {
      if (!bySlug.has(slug)) continue;
      const codes = codesBySlug.get(slug) ?? new Set<string>();
      codes.add(code);
      codesBySlug.set(slug, codes);
    }
  }

  return definitions
    .map((definition) => {
      const prefix = definition.atc.toUpperCase();
      const members = [...codesBySlug.entries()]
        .filter(([, codes]) => [...codes].some((code) => code.startsWith(prefix)))
        .map(([slug]) => bySlug.get(slug))
        .filter((item): item is SubstanceCounts => Boolean(item))
        .map((item) => ({
          slug: item.slug,
          name: item.name,
          reports: item.reports,
          seriousReports: item.seriousReports,
          fatalReports: item.fatalReports,
        }))
        .sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name, "da"));
      return {
        ...definition,
        members,
        reports: members.reduce((sum, item) => sum + item.reports, 0),
        seriousReports: members.reduce((sum, item) => sum + item.seriousReports, 0),
        fatalReports: members.reduce((sum, item) => sum + item.fatalReports, 0),
      };
    })
    .filter((group) => group.members.length > 0)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "da"));
}

export function categoriesForSubstance(groups: CategoryGroup[], slug: string): CategoryGroup[] {
  const matches = groups.filter((group) => group.members.some((member) => member.slug === slug));
  return matches.filter(
    (group) =>
      !matches.some(
        (other) => other.atc !== group.atc && other.atc.startsWith(group.atc) && other.atc.length > group.atc.length,
      ),
  );
}
