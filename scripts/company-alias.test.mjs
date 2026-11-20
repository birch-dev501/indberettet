import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { chooseShortTarget } from "./company-alias.mjs";

const companies = JSON.parse(readFileSync(new URL("../data/companies.json", import.meta.url), "utf8")).companies;

test("bindestreg vælger det ene firma med det ord", () => {
  assert.equal(chooseShortTarget(companies, "medi"), "medi-radiopharma");
  assert.equal(chooseShortTarget(companies, "hal"), "hal-allergy");
  assert.equal(chooseShortTarget(companies, "gen"), "gen-orph");
  assert.equal(chooseShortTarget(companies, "novo"), "novo-nordisk");
  assert.equal(chooseShortTarget(companies, "blue"), null);
  assert.equal(chooseShortTarget(companies, "pharma"), null);
  assert.equal(chooseShortTarget(companies, "laboratorio"), null);
});

test("glaxo og nova bliver ved det store firma", () => {
  assert.equal(chooseShortTarget(companies, "glaxo"), "glaxosmithkline");
  assert.equal(chooseShortTarget(companies, "nova"), "novartis");
});
