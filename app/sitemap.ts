import type { MetadataRoute } from "next";
import { getCategories, getCompanyCatalog, getDiseases, getIndex } from "@/lib/data";

export const dynamic = "force-static";

const site = "https://birch-dev501.github.io/indberettet";

export default function sitemap(): MetadataRoute.Sitemap {
  const index = getIndex();
  const lastModified = index.dataExtractionDateMax ? new Date(index.dataExtractionDateMax) : undefined;
  const paths = [
    "/",
    "/boedesager/",
    "/firma/",
    "/forstaa-forskning/",
    "/forstaa-usikkerhed/",
    "/forstaa-testen/",
    "/katalog/",
    "/kategori/",
    "/om-data/",
    "/soeg/",
    "/sygdom/",
    ...index.substances.map((item) => `/stof/${item.slug}/`),
    ...getCompanyCatalog().companies.map((item) => `/firma/${item.slug}/`),
    ...getCategories().map((item) => `/kategori/${item.slug}/`),
    ...getDiseases().map((item) => `/sygdom/${item.slug}/`),
  ];
  return paths.map((path) => ({
    url: `${site}${path}`,
    lastModified,
  }));
}
