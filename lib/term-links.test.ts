import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveSoc, resolveTerm, type TermLinksFile } from "./term-links.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const file = JSON.parse(readFileSync(path.join(root, "data/term-links.json"), "utf8")) as TermLinksFile;
const allowedHosts = new Set([
  "sundhed.dk",
  "www.sundhed.dk",
  "medlineplus.gov",
  "www.medlineplus.gov",
  "nhs.uk",
  "www.nhs.uk",
]);

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

test("et direkte link er https hos en kendt kilde", () => {
  for (const row of [...Object.values(file.terms), ...Object.values(file.socs)]) {
    assert.ok(row.kind === "direct" || row.kind === "search");
    assert.equal(typeof row.danish, "string");
    assert.ok(row.danish.length > 0);
    const url = new URL(row.url);
    assert.equal(url.protocol, "https:");
    assert.ok(allowedHosts.has(url.hostname), row.url);
    if (row.kind === "direct") {
      assert.equal(row.verified, true);
      assert.equal(row.url.includes("/soeg/"), false);
    }
    if (row.kind === "search") assert.match(row.url, /\/soeg\/\?q=/);
  }
  assert.match(file.search.urlTemplate, /\{q\}/);
  assert.equal(file.search.verified, true);
});

test("hovedpine linker direkte, og en ukendt term bliver en søgning", () => {
  const headache = resolveTerm("Headache", file);
  assert.equal(headache.search, false);
  assert.equal(headache.danish, "Hovedpine");
  assert.match(headache.href ?? "", /hjerne-og-nerver\/symptomer\/hovedpine/);

  const unknown = resolveTerm("Totally Unknown Term", file);
  assert.equal(unknown.search, true);
  assert.equal(unknown.danish, null);
  assert.match(unknown.href ?? "", /patienthaandbogen\/soeg\/\?q=Totally%20Unknown%20Term/);

  const granuloma = resolveTerm("Vaccination site granuloma", file);
  assert.equal(granuloma.search, true);
  assert.equal(granuloma.danish, "Granulom på vaccinationsstedet");
  assert.match(granuloma.href ?? "", /\/soeg\/\?q=/);

  const withdrawn = resolveTerm("Headache", {
    ...file,
    terms: { ...file.terms, Headache: { ...file.terms.Headache, verified: false } },
  });
  assert.equal(withdrawn.search, true);
  assert.match(withdrawn.href ?? "", /\/soeg\/\?q=Hovedpine/);

  assert.equal(resolveSoc("Nerv", "Nervesystemet (Nerv)", file).search, false);
  assert.equal(resolveSoc("Genrl", "Almene symptomer", file).search, true);
});

test("dækningen er andelen af reaktioner med et direkte link", () => {
  const direct = new Set(
    Object.entries(file.terms)
      .filter(([, row]) => row.kind === "direct" && row.verified)
      .map(([name]) => name),
  );
  let occurrences = 0;
  let directOccurrences = 0;
  for (const rows of substanceViews()) {
    for (const term of rows) {
      occurrences += term.reactions;
      if (direct.has(term.pt)) directOccurrences += term.reactions;
    }
  }
  assert.equal(file.coverage?.reactionOccurrences, occurrences);
  assert.equal(file.coverage?.directOccurrences, directOccurrences);
  assert.ok(directOccurrences / occurrences > 0.3);
});
