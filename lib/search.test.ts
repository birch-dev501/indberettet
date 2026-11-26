import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { assignCategories, type CategoryDefinition } from "./categories.ts";
import { buildSearchIndex, groupSearch, searchCatalog, type DiseaseSearchRecord, type ProductRecord, type ReviewedSynonyms, type SubstanceRecord } from "./search.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const substances = (JSON.parse(readFileSync(path.join(root, "data/index.json"), "utf8")) as { substances: SubstanceRecord[] }).substances;
const products = JSON.parse(readFileSync(path.join(root, "data/products.json"), "utf8")) as ProductRecord[];
const reviewed = JSON.parse(readFileSync(path.join(root, "search/synonyms.reviewed.json"), "utf8")) as ReviewedSynonyms;
const categoryFile = JSON.parse(readFileSync(path.join(root, "data/categories.json"), "utf8")) as {
  categories: CategoryDefinition[];
};
const categoryGroups = assignCategories(categoryFile.categories, substances, products);
const diseases = (JSON.parse(readFileSync(path.join(root, "data/diseases.json"), "utf8")) as { diseases: DiseaseSearchRecord[] }).diseases;
const index = buildSearchIndex({
  substances,
  products,
  reviewed,
  diseases,
  categories: categoryGroups.map((group) => ({
    slug: group.slug,
    name: group.name,
    terms: group.terms,
    reports: group.reports,
    members: group.members.length,
  })),
  overviewNames: [
    {
      slug: "covid-19-vaccines",
      names: ["COMIRNATY", "SPIKEVAX", "TOZINAMERAN", "FAMTOZINAMERAN"],
    },
  ],
});

function top(query: string) {
  return searchCatalog(index, query, 8);
}

function expectReason(query: string, pattern: RegExp) {
  const hit = top(query).hits[0];
  assert.ok(hit, query);
  assert.match(hit.reason, pattern, query);
  return hit;
}

function expectSlug(query: string, slug: string) {
  const result = top(query);
  assert.equal(result.hits[0]?.slug, slug, `${query} → ${result.hits[0]?.name} (${result.hits[0]?.reason})`);
  return result.hits[0];
}

test("ozempic og wegovy finder semaglutid", () => {
  const ozempic = expectSlug("ozempic", "semaglutide");
  assert.match(ozempic.reason, /Ozempic → Semaglutide/);
  expectSlug("wegovy", "semaglutide");
  expectSlug("rybelsus", "semaglutide");
  expectSlug("semaglutid", "semaglutide");
  expectSlug("SEMAGLUTIDE", "semaglutide");
});

test("slåfejl i ozempik finder stadig semaglutid", () => {
  expectSlug("ozempik", "semaglutide");
});

test("pfizer og moderna med stavning peger på covid-oversigten", () => {
  const pfizer = expectSlug("phizer corona vaccine", "covid-19-vaccines");
  assert.match(pfizer.reason, /COVID-19 vaccines|Covid-19 Vaccines/);
  expectSlug("pfizer covid", "covid-19-vaccines");
  expectSlug("biontech", "covid-19-vaccines");
  expectSlug("comirnaty", "covid-19-vaccines");
  expectSlug("moderna", "covid-19-vaccines");
  expectSlug("spikevax", "covid-19-vaccines");
});

test("astrazeneca, janssen og novavax har ingen egen oversigt", () => {
  for (const query of ["vaxzevria", "astrazeneca vaccine", "astazeneca vaccine", "chadox1", "jcovden", "janssen vaccine", "nuvaxovid", "novavax"]) {
    const hit = top(query).hits[0];
    assert.equal(hit?.unavailable, true, query);
    assert.equal(hit?.slug, null, query);
    assert.match(hit?.explanation ?? "", /ikke|ingen/i, query);
  }
});

test("panodil, pamol og paracetamol", () => {
  expectSlug("panodil", "paracetamolum");
  expectSlug("pamol", "paracetamolum");
  expectSlug("panadil", "paracetamolum");
  expectSlug("paracetamol", "paracetamolum");
  assert.equal(top("pamol").hits.some((hit) => hit.slug === "bupropion"), false);
});

test("kendte handelsnavne finder det aktive stof først", () => {
  const brands: [string, string][] = [
    ["panodil", "paracetamolum"],
    ["pamol", "paracetamolum"],
    ["ipren", "ibuprofen"],
    ["ozempic", "semaglutide"],
    ["wegovy", "semaglutide"],
    ["comirnaty", "covid-19-vaccines"],
    ["spikevax", "covid-19-vaccines"],
    ["ventoline", "salbutamol"],
    ["seroxat", "paroxetine"],
    ["zolpidem", "zolpidem"],
  ];
  for (const [query, slug] of brands) expectSlug(query, slug);
});

test("hverdagsord bruger ATC eller afgrænsede stoffer", () => {
  const thinner = expectReason("blodfortynder", /blodfortynder → /);
  assert.notEqual(thinner.slug, "semaglutide");
  const pain = top("smertestillende").hits.map((hit) => hit.slug);
  assert.ok(pain.includes("paracetamolum") || pain.includes("ibuprofen"));
  expectSlug("slankemedicin", "semaglutide");
  const diabetes = top("diabetes").hits.map((hit) => hit.slug);
  assert.ok(diabetes.includes("semaglutide") || diabetes.includes("metformin"));
});

test("danske tegn og tom søgning", () => {
  expectSlug("vaegttabsmedicin", "semaglutide");
  const empty = searchCatalog(index, "xqzzyplonk");
  assert.equal(empty.hits.length, 0);
  assert.ok(Array.isArray(empty.suggestions));
});

test("ibuprofen med en stavefejl", () => {
  expectSlug("ibuprofin", "ibuprofen");
});

test("influenzavacciner finder oversigten med de rigtige mærker", () => {
  for (const query of [
    "influenza vaccine",
    "influenzavaccine",
    "flu vaccine",
    "influenza",
    "vaxigrip",
    "fluenz",
    "næsespray influenza",
    "influvac",
    "efluelda",
    "flucelvax",
    "fluad",
  ]) {
    expectSlug(query, "influenza-vaccines");
  }
  const supemtek = top("supemtek").hits[0];
  assert.equal(supemtek?.unavailable, true);
  assert.equal(supemtek?.slug, null);
});

test("sygdomsord finder gruppen og stoffer", () => {
  for (const [query, slug] of [
    ["diabetes", "diabetes"],
    ["migræne", "migraene"],
    ["depression", "depression"],
    ["højt blodtryk", "hojt-blodtryk"],
  ] as const) {
    const hits = top(query).hits;
    assert.equal(hits[0]?.kind, "disease", query);
    assert.equal(hits[0]?.slug, slug, query);
    assert.ok(hits.some((hit) => hit.kind === "substance"), query);
  }
});

test("statiner og vacciner findes som grupper", () => {
  const statiner = categoryGroups.find((group) => group.slug === "statiner");
  assert.ok(statiner);
  for (const name of ["Simvastatin", "Atorvastatin", "Rosuvastatin", "Pravastatinum", "Fluvastatin"]) {
    assert.ok(statiner.members.some((member) => member.name === name), name);
  }
  const statinHit = expectSlug("statiner", "statiner");
  assert.equal(statinHit.kind, "category");
  assert.equal(top("kolesterolmedicin").hits[0]?.kind, "category");
  assert.equal(top("kolesterolmedicin").hits[0]?.slug, "statiner");
  const vaccineHit = expectSlug("vacciner", "vacciner");
  assert.equal(vaccineHit.kind, "category");
  assert.ok(categoryGroups.find((group) => group.slug === "vacciner")?.members.some((member) => member.slug === "covid-19-vaccines"));
  expectSlug("influenza vaccine", "influenza-vaccines");
});

test("vaccinemærker uden stofnavn finder deres egen oversigt", () => {
  expectSlug("havrix", "hepatitis-a-vaccines");
  expectSlug("engerix-b", "hepatitis-b-vaccines");
  expectSlug("gardasil", "human-papilloma-vaccines");
  expectSlug("cervarix", "human-papilloma-vaccines");
  const prevenar = expectSlug("prevenar", "pneumococcal-vaccines");
  assert.match(prevenar.reason, /Prevenar/);
  expectSlug("pneumovax", "pneumococcal-vaccines");
  expectSlug("encepur", "tick-borne-encephalitis-tbe-vaccines");
  expectSlug("ixiaro", "tick-borne-encephalitis-tbe-vaccines");
  expectSlug("shingrix", "varicella-zoster-vaccines");
  expectSlug("qdena", "dengue-vaccine");
  expectSlug("rabipur", "rabies-vaccines");
  expectSlug("stamaril", "yellow-fever-vaccines");
  expectSlug("dukoral", "cholera-vaccines");
  expectSlug("arexvy", "respiratory-syncytial-virus-recombinant-glycoprotein-f");
  for (const query of ["nuvaxovid", "nuvaxovid xbb", "supemtek"]) {
    const hit = top(query).hits[0];
    assert.equal(hit?.slug, null, query);
    assert.equal(hit?.unavailable, true, query);
  }
});

test("testen og falsk positiv finder siden om testen", () => {
  for (const query of ["testen", "falsk positiv", "falske positive"]) {
    const pages = groupSearch(index, query).find((group) => group.id === "page");
    assert.ok(pages?.hits.some((hit) => hit.href === "/forstaa-testen"), query);
  }
});

test("donanemab og kisunla finder siden om donanemab", () => {
  for (const query of ["donanemab", "kisunla", "donanemab alzheimer"]) {
    const pages = groupSearch(index, query).find((group) => group.id === "page");
    assert.ok(pages?.hits.some((hit) => hit.href === "/donanemab-alzheimer"), query);
  }
});
