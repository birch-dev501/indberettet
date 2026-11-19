import assert from "node:assert/strict";
import test from "node:test";
import { filterCompanies, type CompanyFilterRow } from "./company-filter.ts";

const rows: CompanyFilterRow[] = [
  {
    slug: "msd",
    label: "MSD (Merck Sharp & Dohme)",
    aliases: ["MSD", "Merck Sharp & Dohme", "Merck & Co"],
    productRows: 10,
    substanceCount: 4,
  },
  {
    slug: "merck",
    label: "Merck (Merck KGaA)",
    aliases: ["Merck", "Merck KGaA", "Merck Serono"],
    productRows: 8,
    substanceCount: 3,
  },
  {
    slug: "eli-lilly",
    label: "Eli Lilly",
    aliases: ["Eli Lilly Nederland B.V."],
    productRows: 5,
    substanceCount: 2,
  },
];

test("firmanavn med præfiks rangeres foran et alias", () => {
  const found = filterCompanies("merck", rows).map((row) => row.slug);
  assert.deepEqual(found, ["merck", "msd"]);
  assert.deepEqual(filterCompanies("msd", rows).map((row) => row.slug), ["msd"]);
});

test("fuzzy stavning finder Eli Lilly", () => {
  assert.equal(filterCompanies("eli lily", rows)[0]?.slug, "eli-lilly");
});
