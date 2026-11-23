import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { effectView, effectsForSubstance } from "./effect-records.ts";
import { armMeasures, benefitHarm, effectMeasures, trialRisks } from "./effects.ts";

test("8 af 18.198 mod 162 af 18.325 giver RRR 95,0 %, ARR 0,84 procentpoint og NNT 119", () => {
  const result = armMeasures(8, 18_198, 162, 18_325);
  assert.ok(result);
  assert.equal((result.rrr! * 100).toFixed(1), "95.0");
  assert.equal((result.arr * 100).toFixed(2), "0.84");
  assert.equal(result.nnt, 119);
  assert.equal((1 / result.arr).toFixed(2), "119.04");
  assert.equal(result.arr.toFixed(4), "0.0084");
});

test("Comirnaty-posten bruger de samme arme og har intet interval for NNT", () => {
  const file = JSON.parse(readFileSync("data/effects.json", "utf8")) as {
    effects: {
      id: string;
      arms: { treated: { events: number; n: number }; control: { events: number; n: number } };
      publishedEffect: { value: number; polackCri: { low: number; high: number }; emaCi: { low: number; high: number } };
      nntInterval?: unknown;
      arrInterval?: unknown;
    }[];
  };
  const record = file.effects.find((item) => item.id === "c4591001-primary");
  assert.ok(record);
  const result = armMeasures(record.arms.treated.events, record.arms.treated.n, record.arms.control.events, record.arms.control.n);
  assert.equal(result?.nnt, 119);
  assert.equal(record.publishedEffect.value, 0.95);
  assert.equal(record.publishedEffect.polackCri.low, 0.903);
  assert.equal(record.publishedEffect.polackCri.high, 0.976);
  assert.equal(record.publishedEffect.emaCi.low, 0.9);
  assert.equal(record.publishedEffect.emaCi.high, 0.979);
  assert.equal(record.nntInterval, undefined);
  assert.equal(record.arrInterval, undefined);
});

test("en post uden offentliggjorte intervaller viser ikke opfundne grænser", () => {
  const view = effectView({
    id: "bare",
    substanceSlug: "test",
    product: "Eksempel",
    trial: "T1",
    population: "Voksne.",
    endpoint: "Død.",
    treatedGroup: "behandlede",
    controlGroup: "placebogruppen",
    action: "behandles",
    prevented: "ét dødsfald",
    arms: { treated: { events: 10, n: 100 }, control: { events: 20, n: 100 } },
    sources: [],
    retrieved: "2026-11-23",
    caveats: [],
  });
  assert.equal(view?.intervals.length, 0);
  assert.equal(view?.nnt, "10");
  assert.equal(effectsForSubstance("semaglutide").length, 0);
});

test("BNT162b2 giver cirka 95 procent RRR, 0,84 procentpoint ARR og NNT 119", () => {
  const { treated, control, measures } = trialRisks();
  assert.ok(Math.abs(measures.rrr! - 0.9503) < 0.0001);
  assert.ok(Math.abs(measures.arr - 0.008401) < 0.00001);
  assert.equal(Math.round(measures.nnt!), 119);
  assert.ok(treated < 0.0005);
  assert.ok(control > 0.008 && control < 0.009);
});

test("eksemplet giver NNT 10.000 og dobbelt så mange reaktioner som forebyggede indlæggelser", () => {
  const result = benefitHarm(1 / 10_000, 1, [{ risk: 1 / 5_000 }]);
  assert.equal(result?.nnt, 10_000);
  assert.equal(result?.harms[0]?.nnh, 5_000);
  assert.equal(result?.preventedPer100k, 10);
  assert.equal(result?.harms[0]?.causedPer100k, 20);
});

test("højere risiko i den behandlede gruppe giver NNH", () => {
  const harm = effectMeasures(0.05, 0.02);
  assert.equal(harm?.nnt, null);
  assert.ok(harm && Math.abs(harm.nnh! - 1 / 0.03) < 1e-9);
});
