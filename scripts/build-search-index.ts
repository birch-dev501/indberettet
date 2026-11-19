import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assignCategories, type CategoryDefinition } from "../lib/categories.ts";
import { buildCompanyCatalog } from "../lib/companies.ts";
import { buildSearchIndex, type ProductRecord, type SubstanceRecord } from "../lib/search.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const index = JSON.parse(readFileSync(path.join(root, "data/index.json"), "utf8")) as {
  substances: (SubstanceRecord & { seriousReports: number; fatalReports: number })[];
};
const products = JSON.parse(readFileSync(path.join(root, "data/products.json"), "utf8")) as ProductRecord[];
const reviewed = JSON.parse(readFileSync(path.join(root, "search/synonyms.reviewed.json"), "utf8"));
const categoryFile = JSON.parse(readFileSync(path.join(root, "data/categories.json"), "utf8")) as {
  categories: CategoryDefinition[];
};

const overviewNames: { slug: string; names: string[] }[] = [];
const substanceDir = path.join(root, "data/substances");
for (const file of readdirSync(substanceDir)) {
  if (!file.endsWith(".json")) continue;
  const document = JSON.parse(readFileSync(path.join(substanceDir, file), "utf8")) as {
    slug: string;
    productNames?: { single?: string[]; multi?: string[] };
  };
  const names = [...(document.productNames?.single ?? []), ...(document.productNames?.multi ?? [])];
  if (names.length) overviewNames.push({ slug: document.slug, names });
}

const substances: SubstanceRecord[] = index.substances.map((item) => ({
  slug: item.slug,
  name: item.name,
  reports: item.reports,
  showcase: Boolean(item.showcase),
}));

const categoryGroups = assignCategories(categoryFile.categories, index.substances, products);
const diseases = JSON.parse(readFileSync(path.join(root, "data/diseases.json"), "utf8")) as {
  diseases: { slug: string; name: string; terms: string[]; atcPrefixes: string[] }[];
};
const plain = JSON.parse(readFileSync(path.join(root, "data/plain-language.json"), "utf8")) as {
  substances: Record<string, { className?: { value?: string } }>;
};
const labels = Object.entries(plain.substances).flatMap(([slug, row]) => {
  const text = row.className?.value?.trim();
  return text ? [{ slug, text }] : [];
});
const companyCatalog = buildCompanyCatalog(
  products,
  index.substances.map((item) => ({
    slug: item.slug,
    name: item.name,
    reports: item.reports,
    seriousReports: item.seriousReports,
    fatalReports: item.fatalReports,
  })),
  overviewNames,
);
writeFileSync(path.join(root, "data/companies.json"), JSON.stringify(companyCatalog));

const searchIndex = buildSearchIndex({
  substances,
  products,
  reviewed,
  overviewNames,
  diseases: diseases.diseases,
  labels,
  categories: categoryGroups.map((group) => ({
    slug: group.slug,
    name: group.name,
    terms: group.terms,
    reports: group.reports,
    members: group.members.length,
  })),
});
const generatedAliases = searchIndex.aliases.filter((alias) => alias.kind !== "synonym");
const generated = {
  note: "Bygget fra produktlisten, indehavere og navne i bivirkningsoversigterne. Ret ikke filen i hånden. Hverdagsord ligger i synonyms.reviewed.json.",
  generatedAt: new Date().toISOString(),
  aliasCount: generatedAliases.length,
  aliases: generatedAliases,
};

const searchDir = path.join(root, "search");
mkdirSync(searchDir, { recursive: true });
writeFileSync(path.join(searchDir, "synonyms.from-products.json"), JSON.stringify(generated));

const publicDir = path.join(root, "public/generated");
mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, "search-index.json"), JSON.stringify(searchIndex));
writeFileSync(path.join(root, "public/.nojekyll"), "");
console.log(
  `Søgeindeks: ${searchIndex.aliases.length} navne, ${substances.length} stoffer, ${categoryGroups.length} grupper.`,
);
