import { cache } from "react";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { assignCategories, type CategoryDefinition, type CategoryGroup } from "./categories";
import type { CompanyCatalog, CompanyPage, SubstanceIdentity } from "./companies";
import type { UsageFile } from "./rates";

export type PlainField = { value: string; source: string; needsReview: boolean };

export type PlainLanguage = {
  needsReview: boolean;
  brands: PlainField;
  className: PlainField;
  use: PlainField;
  indication: PlainField;
};

export type DiseaseEntry = {
  slug: string;
  name: string;
  terms: string[];
  atcPrefixes: string[];
  summary: string;
  source: string;
  needsReview: boolean;
};
import type { DataIndex, DataStatus, NewsItem, ProductRecord, Substance, SubstanceSummary } from "./types";

const dataDir = path.join(process.cwd(), "data");

function readJson<T>(relative: string): T {
  const file = path.join(dataDir, relative);
  if (!existsSync(file)) {
    throw new Error(`Mangler datafil: ${relative}. Kør python scripts/ingest.py`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export const getIndex = cache((): DataIndex => readJson<DataIndex>("index.json"));

export const getStatus = cache((): DataStatus => readJson<DataStatus>("status.json"));

export const getProducts = cache((): ProductRecord[] => readJson<ProductRecord[]>("products.json"));

export const getCategories = cache((): CategoryGroup[] => {
  const file = readJson<{ categories: CategoryDefinition[] }>("categories.json");
  return assignCategories(file.categories, getIndex().substances, getProducts());
});

export function getCategory(slug: string): CategoryGroup | undefined {
  return getCategories().find((group) => group.slug === slug);
}

export const getCompanyCatalog = cache((): CompanyCatalog => readJson<CompanyCatalog>("companies.json"));

export function getIdentity(slug: string): SubstanceIdentity | null {
  return getCompanyCatalog().bySlug[slug] ?? null;
}

export function getCompany(slug: string): CompanyPage | undefined {
  return getCompanyCatalog().companies.find((company) => company.slug === slug);
}

export const getPlainLanguage = cache((): Record<string, PlainLanguage> => {
  const file = path.join(dataDir, "plain-language.json");
  if (!existsSync(file)) return {};
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { substances: Record<string, PlainLanguage> };
  return parsed.substances ?? {};
});

export function getPlain(slug: string): PlainLanguage | null {
  return getPlainLanguage()[slug] ?? null;
}

export const getDiseases = cache((): DiseaseEntry[] => {
  const file = path.join(dataDir, "diseases.json");
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { diseases: DiseaseEntry[] };
  return parsed.diseases ?? [];
});

export function getUsage(): UsageFile | null {
  const file = path.join(dataDir, "usage", "persons.json");
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as UsageFile;
  return parsed.ok ? parsed : null;
}

export const getSubstance = cache((slug: string): Substance | null => {
  const file = path.join(dataDir, "substances", `${slug}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as Substance;
});

export function getNews(slug: string): NewsItem[] {
  const file = path.join(process.cwd(), "news", "items", `${slug}.json`);
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8")) as NewsItem[];
  return parsed.filter(
    (item) =>
      typeof item.url === "string" &&
      item.url.startsWith("https://laegemiddelstyrelsen.dk/") &&
      item.url.includes("/nyheder/"),
  );
}

export function getSummary(slug: string): SubstanceSummary | undefined {
  return getIndex().substances.find((item) => item.slug === slug);
}

export function dataUpdatedLabel(): string {
  const index = getIndex();
  if (
    index.dataExtractionDateMin &&
    index.dataExtractionDateMax &&
    index.dataExtractionDateMin !== index.dataExtractionDateMax
  ) {
    return `${index.dataExtractionDateMin}–${index.dataExtractionDateMax}`;
  }
  return index.dataExtractionDateMax ?? index.generatedAt;
}
