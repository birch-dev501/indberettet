import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { brandLabel, buildCompanyCatalog, normalizeHolder } from "./companies.ts";
import { buildSearchIndex, searchCatalog, type ProductRecord, type ReviewedSynonyms, type SubstanceRecord } from "./search.ts";

test("MSD og det tyske Merck holdes adskilt", () => {
  for (const holder of ["Merck Sharp & Dohme B.V.", "Merck Sharp & Dohme Ltd.", "MSD VACCINS"]) {
    assert.equal(normalizeHolder(holder).key, "msdmercksharpdohme", holder);
    assert.equal(normalizeHolder(holder).label, "MSD (Merck Sharp & Dohme)");
  }
  for (const holder of ["Merck Europe B.V.", "Merck A/S", "Serono Europe Ltd."]) {
    assert.equal(normalizeHolder(holder).key, "merckkgaa", holder);
    assert.equal(normalizeHolder(holder).label, "Merck (Merck KGaA)");
  }
  assert.notEqual(normalizeHolder("Merck A/S").key, normalizeHolder("Merck Sharp & Dohme B.V.").key);
});

test("firmanavne samles uden at blande Novo Nordisk og KRKA", () => {
  assert.deepEqual(normalizeHolder("Novo Nordisk A/S"), { key: "novonordisk", label: "Novo Nordisk" });
  assert.deepEqual(normalizeHolder("Eli Lilly Nederland B.V."), { key: "elililly", label: "Eli Lilly" });
  assert.deepEqual(normalizeHolder("Eli Lilly Netherland B.V."), { key: "elililly", label: "Eli Lilly" });
  assert.deepEqual(normalizeHolder("Eli Lilly and Company (Ireland) Limited"), { key: "elililly", label: "Eli Lilly" });
  assert.equal(normalizeHolder("KRKA d.d. Novo mesto").key, "krka");
  assert.equal(normalizeHolder("KRKA, d.d., Novo mesto").key, "krka");
  assert.equal(normalizeHolder("KRKA tovarna zdravil d.d. Novo mesto").label, "KRKA");
  assert.equal(normalizeHolder("STADA Arzneimittel AG").label, "STADA");
  assert.equal(normalizeHolder("STADA Nordic ApS").label, "STADA");
  assert.notEqual(normalizeHolder("KRKA d.d. Novo mesto").key, normalizeHolder("Novo Nordisk A/S").key);
});

test("handelsnavnet beholder firmaet i citationstegn", () => {
  assert.equal(brandLabel('Simvastatin "KRKA"'), "Simvastatin KRKA");
  assert.equal(brandLabel('Simvastatin "Stada"'), "Simvastatin Stada");
  assert.equal(brandLabel("Crestor"), "Crestor");
  assert.equal(brandLabel('SIMVASTATIN "ACTAVIS" 40 MG FILM-COATED TABLET'), "Simvastatin Actavis");
});

test("simvastatin viser præparatnavne og firmaer fra den godkendte liste", () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const products = JSON.parse(readFileSync(path.join(root, "data/products.json"), "utf8")) as ProductRecord[];
  const substances = (JSON.parse(readFileSync(path.join(root, "data/index.json"), "utf8")) as { substances: SubstanceRecord[] }).substances;
  const catalog = buildCompanyCatalog(
    products,
    substances.map((item) => ({ ...item, seriousReports: 0, fatalReports: 0 })),
  );
  const simvastatin = catalog.bySlug.simvastatin;
  assert.ok(simvastatin.brands.some((brand) => /simvastatin krka/i.test(brand)), simvastatin.brands.join(", "));
  assert.ok(simvastatin.brands.slice(0, 3).every((brand) => !/inegy|perichol|ezimvalla/i.test(brand)));
  assert.ok(simvastatin.brandCount > simvastatin.brands.slice(0, 3).length);
  assert.ok(simvastatin.companies.some((company) => company.label === "KRKA"));
  const novo = catalog.companies.find((company) => company.slug === "novo-nordisk");
  const lilly = catalog.companies.find((company) => company.slug === "eli-lilly");
  assert.ok(novo && novo.substances.length > 0);
  assert.ok(lilly && lilly.variants.length >= 3);
  assert.equal(catalog.companies.filter((company) => company.slug === "novo-nordisk").length, 1);
  const msd = catalog.companies.find((company) => company.slug === "msd");
  const german = catalog.companies.find((company) => company.slug === "merck");
  assert.ok(msd?.note?.includes("amerikanske"));
  assert.ok(german?.note?.includes("tyske"));
  assert.ok(msd && msd.variants.some((variant) => variant.includes("Sharp")));
  assert.ok(msd && msd.variants.some((variant) => variant.includes("MSD")));
  assert.ok(german && german.variants.some((variant) => variant.includes("Serono")));
  assert.equal(catalog.companies.some((company) => company.slug === "serono" || company.slug === "msd-vaccins"), false);
});

test("søgning finder firmaet også ved eli lily og novo", () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const products = JSON.parse(readFileSync(path.join(root, "data/products.json"), "utf8")) as ProductRecord[];
  const substances = (JSON.parse(readFileSync(path.join(root, "data/index.json"), "utf8")) as { substances: SubstanceRecord[] }).substances;
  const reviewed = JSON.parse(readFileSync(path.join(root, "search/synonyms.reviewed.json"), "utf8")) as ReviewedSynonyms;
  const index = buildSearchIndex({ substances, products, reviewed });
  const novo = searchCatalog(index, "novo", 8).hits.find((hit) => hit.kind === "company");
  assert.equal(novo?.slug, "novo-nordisk");
  const lily = searchCatalog(index, "eli lily", 8).hits.find((hit) => hit.kind === "company");
  assert.equal(lily?.slug, "eli-lilly");
  const krka = searchCatalog(index, "novo", 8).hits.filter((hit) => hit.kind === "company" && hit.slug === "krka");
  assert.equal(krka.length, 0);
  for (const query of ["merck", "merk"]) {
    const slugs = searchCatalog(index, query, 8).hits.filter((hit) => hit.kind === "company").map((hit) => hit.slug);
    assert.ok(slugs.includes("msd"), query);
    assert.ok(slugs.includes("merck"), query);
  }
  const msdOnly = searchCatalog(index, "msd", 8).hits.filter((hit) => hit.kind === "company").map((hit) => hit.slug);
  assert.deepEqual(msdOnly, ["msd"]);
  const sharp = searchCatalog(index, "merck sharp dohme", 8).hits.filter((hit) => hit.kind === "company").map((hit) => hit.slug);
  assert.deepEqual(sharp, ["msd"]);
});
