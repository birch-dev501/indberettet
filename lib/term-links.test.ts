import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveSoc, resolveTerm, type TermLinksFile } from "./term-links.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const file = JSON.parse(readFileSync(path.join(root, "data/term-links.json"), "utf8")) as TermLinksFile;
const allowedHosts = new Set(["sundhed.dk", "www.sundhed.dk", "medlineplus.gov", "www.medlineplus.gov", "nhs.uk", "www.nhs.uk"]);

function substanceViews(): { pt: string; reactions: number; soc: string }[][] {
  return readdirSync(path.join(root, "data/substances"))
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const view = JSON.parse(readFileSync(path.join(root, "data/substances", name), "utf8")).views.all;
      return view.terms.map((term: { pt: string; reactions: number; soc: string }) => term);
    });
}

test("kortet bruger kun termer fra udtrækket", () => {
  const terms = new Set<string>();
  const socs = new Set<string>();
  for (const rows of substanceViews()) {
    for (const term of rows) {
      terms.add(term.pt);
      socs.add(term.soc);
    }
  }
  for (const term of Object.keys(file.terms)) assert.ok(terms.has(term), term);
  for (const abbrev of Object.keys(file.socs)) assert.ok(socs.has(abbrev), abbrev);
  assert.equal(Object.keys(file.socs).length, 27);
});

test("et link er https og er ikke en tom engelsk søgning", () => {
  for (const row of [...Object.values(file.terms), ...Object.values(file.socs)]) {
    if (!row.verified || !row.url) continue;
    const url = new URL(row.url);
    assert.equal(url.protocol, "https:");
    assert.ok(allowedHosts.has(url.hostname), row.url);
    assert.equal(url.search.includes("q="), false, row.url);
    if (row.kind === "direct") assert.equal(row.url.includes("/soeg/"), false);
    if (row.kind === "search") assert.match(row.url, /SearchTerm=/);
  }
});

test("hovedpine og trombocytopeni peger på den rigtige artikel", () => {
  const headache = resolveTerm("Headache", file);
  assert.equal(headache.search, false);
  assert.equal(headache.danish, "Hovedpine");
  assert.match(headache.href ?? "", /hovedpine/);

  const lowPlatelets = resolveTerm("Thrombocytopenia", file);
  assert.match(lowPlatelets.href ?? "", /blodplademangel/);
  assert.equal((lowPlatelets.href ?? "").includes("purpura"), false);

  const unknown = resolveTerm("Totally Unknown Term", file);
  assert.equal(unknown.href, null);
  for (const term of ["Nausea", "Vomiting", "Diarrhoea", "Iron deficiency anaemia", "Hypercholesterolaemia", "Obesity"]) {
    assert.equal(resolveTerm(term, file).href, null, term);
  }

  assert.equal(resolveSoc("Nerv", "Nervesystemet", file).search, false);
});

test("dækningen tæller de danske artikler", () => {
  assert.equal(typeof file.coverage?.directTerms, "number");
  assert.ok((file.coverage?.directTerms ?? 0) > 10);
  assert.ok((file.coverage?.directShare ?? 0) > 0.05);
});
