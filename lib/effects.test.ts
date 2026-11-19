import assert from "node:assert/strict";
import test from "node:test";
import { effectMeasures, trialRisks } from "./effects.ts";

test("BNT162b2 giver cirka 95 procent RRR, 0,84 procentpoint ARR og NNT 119", () => {
  const { treated, control, measures } = trialRisks();
  assert.ok(Math.abs(measures.rrr! - 0.9503) < 0.0001);
  assert.ok(Math.abs(measures.arr - 0.008401) < 0.00001);
  assert.equal(Math.round(measures.nnt!), 119);
  assert.ok(treated < 0.0005);
  assert.ok(control > 0.008 && control < 0.009);
});

test("højere risiko i den behandlede gruppe giver NNH", () => {
  const harm = effectMeasures(0.05, 0.02);
  assert.equal(harm?.nnt, null);
  assert.ok(harm && Math.abs(harm.nnh! - 1 / 0.03) < 1e-9);
});
