import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const index = JSON.parse(readFileSync(path.join(root, "data/index.json"), "utf8"));
const products = JSON.parse(readFileSync(path.join(root, "data/products.json"), "utf8"));
const outDir = path.join(root, "public/generated");
mkdirSync(outDir, { recursive: true });

const payload = {
  substances: index.substances.map((item) => ({
    slug: item.slug,
    name: item.name,
    reports: item.reports,
    showcase: Boolean(item.showcase),
    brands: item.brands ?? [],
  })),
  products: products.map((item) => ({
    drugId: item.drugId,
    name: item.name,
    form: item.form,
    strength: item.strength,
    atc: item.atc,
    holder: item.holder,
    slugs: item.slugs,
    status: item.status,
  })),
};

writeFileSync(path.join(outDir, "search.json"), JSON.stringify(payload));
writeFileSync(path.join(root, "public/.nojekyll"), "");
