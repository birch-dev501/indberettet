import assert from "node:assert/strict";
import test from "node:test";
import { caseNoteFor } from "./case-notes.ts";
import { caseSearchHits } from "./search.ts";

const companies = [
  { slug: "msd", name: "MSD (Merck Sharp & Dohme)" },
  { slug: "novo-nordisk", name: "Novo Nordisk" },
  { slug: "pfizer", name: "Pfizer" },
];

test("Vioxx-sagerne har lægemiddel og kilde", () => {
  const settlement = caseNoteFor("https://violationtracker.goodjobsfirst.org/violation-tracker/-merck-and-co-1");
  const plea = caseNoteFor("https://violationtracker.goodjobsfirst.org/violation-tracker/-merck-sharp-and-dohme");
  assert.equal(settlement?.summary, "forlig med patienter om hjerte-kar-skader");
  assert.equal(settlement?.drugs[0]?.generic, "rofecoxib");
  assert.equal(settlement?.drugs[0]?.slug, null);
  assert.equal(plea?.firm, "msd");
  assert.match(plea?.sourceUrl ?? "", /justice\.gov/);
});

test("søgning på lægemiddel finder firmasiden", () => {
  const vioxx = caseSearchHits("vioxx", companies);
  assert.equal(vioxx[0]?.slug, "msd");
  assert.match(vioxx[0]?.name ?? "", /Vioxx – bødesag/);
  assert.match(vioxx[0]?.name ?? "", /MSD/);
  assert.match(vioxx[0]?.anchor ?? "", /^sag-/);
  assert.equal(caseSearchHits("viox", companies)[0]?.slug, "msd");
  assert.equal(caseSearchHits("vioks", companies)[0]?.slug, "msd");
  assert.equal(caseSearchHits("victoza", companies)[0]?.slug, "novo-nordisk");
  assert.equal(caseSearchHits("bextra", companies)[0]?.slug, "pfizer");
  assert.equal(caseSearchHits("depakote", companies).length, 0);
});
