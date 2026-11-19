import assert from "node:assert/strict";
import test from "node:test";
import { HIGH_PREVALENCE, LOW_PREVALENCE, bayesCounts } from "./bayes.ts";

function sums(row: NonNullable<ReturnType<typeof bayesCounts>>) {
  assert.equal(row.sick + row.well, row.tested);
  assert.equal(row.truePositive + row.falseNegative, row.sick);
  assert.equal(row.trueNegative + row.falsePositive, row.well);
  assert.equal(row.truePositive + row.falsePositive + row.trueNegative + row.falseNegative, row.tested);
  assert.equal(row.ppv, row.truePositive / (row.truePositive + row.falsePositive));
  assert.equal(row.npv, row.trueNegative / (row.trueNegative + row.falseNegative));
}

test("lav og høj forekomst summer til 10.000", () => {
  for (const row of [LOW_PREVALENCE, HIGH_PREVALENCE]) {
    assert.equal(row.tested, 10_000);
    sums(row);
  }
  assert.equal(LOW_PREVALENCE.sick, 10);
  assert.equal(LOW_PREVALENCE.truePositive, 5);
  assert.equal(LOW_PREVALENCE.falsePositive, 30);
  assert.equal(HIGH_PREVALENCE.sick, 2_000);
  assert.equal(HIGH_PREVALENCE.truePositive, 1_460);
  assert.equal(HIGH_PREVALENCE.falsePositive, 72);
  assert.ok(LOW_PREVALENCE.ppv! < 0.2);
  assert.ok(HIGH_PREVALENCE.ppv! > 0.9);
});

test("ugyldige andele afvises", () => {
  assert.equal(bayesCounts(10_000, 1.2, 0.5, 0.5), null);
  assert.equal(bayesCounts(0, 0.1, 0.5, 0.5), null);
});
