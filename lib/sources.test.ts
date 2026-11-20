import assert from "node:assert/strict";
import test from "node:test";
import { bayesCounts } from "./bayes.ts";
import { cochraneAntigen, husby, karlstad, polack } from "./sources.ts";

test("parrede tal kommer fra samme række", () => {
  assert.equal(cochraneAntigen.asymptomaticRow, "Asymptomatic");
  assert.equal(cochraneAntigen.table, "Summary of findings 1");
  const low = bayesCounts(10_000, 0.001, cochraneAntigen.asymptomaticSensitivity, cochraneAntigen.asymptomaticSpecificity);
  assert.ok(low);
  assert.equal(low.truePositive, Math.round(low.sick * cochraneAntigen.asymptomaticSensitivity));
  assert.equal(low.falsePositive, low.well - Math.round(low.well * cochraneAntigen.asymptomaticSpecificity));
  const high = bayesCounts(10_000, 0.2, cochraneAntigen.symptomaticSensitivity, cochraneAntigen.symptomaticSpecificity);
  assert.equal(high?.truePositive, Math.round(high!.sick * cochraneAntigen.symptomaticSensitivity));
});

test("kildernes intervaller hører til deres skøn", () => {
  assert.ok(karlstad.men16to24BntDose2.low < karlstad.men16to24BntDose2.excessPer100k);
  assert.ok(karlstad.men16to24BntDose2.excessPer100k < karlstad.men16to24BntDose2.high);
  assert.ok(husby.bntHr.low < 1 && husby.bntHr.high > 1);
  assert.ok(husby.modernaHr.low > 1);
  assert.equal(polack.vaccinatedCases, 8);
  assert.equal(polack.placeboCases, 162);
  assert.ok(polack.place.includes("Abstract"));
});
