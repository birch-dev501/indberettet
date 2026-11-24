import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { bannedPhrases, harmCopy, loadCovidHarms, measureText, per100k, perMillion, sourceUnitNote } from "./covid-harms.ts";
import { husby } from "./sources.ts";

test("covid-siden har tre grupper, en kilde pr. punkt og ingen forbudte påstande", () => {
  const file = loadCovidHarms();
  assert.deepEqual(
    file.groups.map((group) => group.id),
    ["established", "signal", "unsupported"],
  );
  assert.equal(file.findings.length > 0, true);
  for (const finding of file.findings) {
    assert.ok(file.groups.some((group) => group.id === finding.group), finding.id);
    const urls = [
      ...finding.measures.map((measure) => measure.sourceUrl),
      ...(finding.links ?? []).map((link) => link.url),
    ];
    assert.ok(urls.length > 0, finding.id);
    for (const url of urls) assert.ok(url.startsWith("https://"), url);
  }
  const text = harmCopy(file);
  assert.deepEqual(bannedPhrases(text), []);
  assert.equal(text.includes("VAERS"), false);
  assert.ok(file.findings.filter((item) => item.group === "unsupported").length >= 3);
  assert.equal(text.includes("cirka 1.100"), true);
  assert.equal(text.includes("Knap halvdelen"), true);
  assert.equal(text.includes("Godt halvdelen"), false);
  assert.equal(text.includes("WITHDRAWN"), true);
  const rose = file.findings.find((item) => item.id === "rose");
  assert.equal(rose?.heading.includes("artiklen") || rose?.heading.includes("artikel"), true);
  assert.equal(rose?.body.includes("etableret ovenfor"), true);
  assert.equal(text.includes("ikke er talt op linje for linje"), true);
  assert.equal(text.includes("før Omikron"), true);
  assert.equal(text.includes("1. december 2020"), true);
  assert.equal(text.includes("stigning hos kvinder"), true);
  assert.equal(text.includes("7 observerede"), true);
  assert.equal(text.includes("0,3 ventede"), true);
  assert.equal(text.includes("10,1 pr. 10.000"), true);
  assert.equal(text.includes("15,1 pr. 10.000"), true);
  const page = readFileSync("app/covid-vacciner-bivirkninger/page.tsx", "utf8");
  assert.deepEqual(bannedPhrases(`${text}\n${page}`), []);
});

test("Husby-tallene på studiesiden er de samme som i kildedefinitionen", () => {
  const measures = loadCovidHarms().findings.find((item) => item.id === "myocarditis")?.measures ?? [];
  const moderna = measures.find((item) => item.id === "husby-moderna");
  const bnt = measures.find((item) => item.id === "husby-bnt");
  assert.equal(moderna?.value, husby.modernaYoungRate.per100k);
  assert.equal(moderna?.low, husby.modernaYoungRate.low);
  assert.equal(moderna?.high, husby.modernaYoungRate.high);
  assert.equal(moderna?.ratio?.value, husby.modernaYoungHr.value);
  assert.equal(moderna?.ratio?.low, husby.modernaYoungHr.low);
  assert.equal(moderna?.ratio?.high, husby.modernaYoungHr.high);
  assert.equal(bnt?.value, husby.bntYoungRate.per100k);
  assert.equal(bnt?.low, husby.bntYoungRate.low);
  assert.equal(bnt?.high, husby.bntYoungRate.high);
  assert.equal(bnt?.ratio?.value, husby.bntYoungHr.value);
  assert.equal(bnt?.ratio?.low, husby.bntYoungHr.low);
  assert.equal(bnt?.ratio?.high, husby.bntYoungHr.high);
  assert.deepEqual(loadCovidHarms().substanceSlugs, ["covid-19-vaccines"]);
});

test("den byggede side har ingen forbudte vendinger", (t) => {
  const html = "out/covid-vacciner-bivirkninger/index.html";
  if (!existsSync(html)) {
    t.skip("out/covid-vacciner-bivirkninger/index.html findes ikke. Kør npm run build først.");
    return;
  }
  assert.deepEqual(bannedPhrases(readFileSync(html, "utf8")), []);
});

test("Nygaards pr. million er afrundet fra tællerne", () => {
  const file = loadCovidHarms();
  const finding = file.findings.find((item) => item.id === "myocarditis");
  const boys = finding?.measures.find((item) => item.id === "nygaard-boys");
  const girls = finding?.measures.find((item) => item.id === "nygaard-girls");
  assert.equal(Math.round(perMillion(boys!.cases!, boys!.n!)), 97);
  assert.equal(boys?.statedPerMillion, 97);
  assert.equal(Math.round(perMillion(girls!.cases!, girls!.n!)), 16);
  assert.equal(measureText(boys!).includes("97 pr. million"), true);
});

test("EMA's 0,56 pr. 10.000 er 5,6 pr. 100.000", () => {
  const file = loadCovidHarms();
  const measure = file.findings
    .flatMap((finding) => finding.measures)
    .find((item) => item.id === "ema-28");
  assert.ok(Math.abs(per100k(measure!.value!, measure!.per!) - 5.6) < 1e-9);
  assert.ok(Math.abs(per100k(measure!.low!, measure!.per!) - 3.7) < 1e-9);
  assert.ok(Math.abs(per100k(measure!.high!, measure!.per!) - 7.4) < 1e-9);
  const shown = measureText(measure!);
  const note = sourceUnitNote(measure!);
  assert.equal(shown.includes("56 (37 til 74) pr. million"), true);
  assert.equal(shown.includes("i kilden"), false);
  assert.equal(note, "I kilden: 0,56 (0,37 til 0,74) pr. 10.000.");
});

test("Fraimans samlede interval udelukker 0, de to forsøg hver for sig gør ikke", () => {
  const file = loadCovidHarms();
  const combined = file.findings.find((item) => item.id === "fraiman")?.measures.find((item) => item.id === "fraiman-combined");
  assert.ok(combined && combined.low! > 0);
  assert.equal(combined?.place.includes("minus 0,4"), true);
  assert.equal(combined?.place.includes("minus 3,6"), true);
});

test("de låste tal er uændrede", () => {
  const measures = new Map(
    loadCovidHarms()
      .findings.flatMap((finding) => finding.measures)
      .map((measure) => [measure.id, measure]),
  );
  const locked: Record<string, { value?: number; low?: number; high?: number; per?: number; cases?: number; n?: number; stated?: number; ratio?: number[] }> = {
    "ema-28": { value: 0.56, low: 0.37, high: 0.74, per: 10000 },
    "ema-7": { value: 0.265, low: 0.255, high: 0.275, per: 10000 },
    "nygaard-boys": { cases: 13, n: 133477, stated: 97 },
    "nygaard-girls": { cases: 2, n: 127857, stated: 16 },
    "husby-moderna": { value: 5.7, low: 3.3, high: 9.3, per: 100000, ratio: [5.24, 2.47, 11.12] },
    "husby-bnt": { value: 1.6, low: 1.0, high: 2.6, per: 100000, ratio: [1.48, 0.74, 2.98] },
    "patone-infection": { value: 40, low: 38, high: 41, per: 1000000 },
    "patone-young-infection": { value: 10, low: 7, high: 11, per: 1000000 },
    "patone-young-moderna": { value: 15, low: 12, high: 16, per: 1000000 },
    "patone-young-bnt": { value: 3, low: 2, high: 4, per: 1000000 },
    "pottegard-cvt": { value: 2.5, low: 0.9, high: 5.2, per: 100000 },
    "pavord-died": { value: 22 },
    "fraiman-combined": { value: 12.5, low: 2.1, high: 22.9, per: 10000 },
    "fraiman-pfizer-placebo": { value: 17.6, per: 10000 },
    "fraiman-moderna-placebo": { value: 42.2, per: 10000 },
    "jabagi-mi": { value: 0.97, low: 0.88, high: 1.06 },
    "pottegard-arterial": { value: 0.97, low: 0.77, high: 1.2, per: 1 },
  };
  assert.deepEqual([...measures.keys()].sort(), Object.keys(locked).sort());
  for (const [id, expected] of Object.entries(locked)) {
    const measure = measures.get(id);
    assert.ok(measure, id);
    assert.equal(measure.value, expected.value);
    assert.equal(measure.low, expected.low);
    assert.equal(measure.high, expected.high);
    assert.equal(measure.per, expected.per);
    assert.equal(measure.cases, expected.cases);
    assert.equal(measure.n, expected.n);
    assert.equal(measure.statedPerMillion, expected.stated);
    assert.deepEqual(
      measure.ratio ? [measure.ratio.value, measure.ratio.low, measure.ratio.high] : undefined,
      expected.ratio,
    );
    assert.equal(measureText(measure).includes(`Gælder: ${measure.applies}.`), true);
    assert.equal(measureText(measure).includes("i kilden"), false);
  }
});

test("teksten gentager ikke de afskårne punkter", () => {
  const file = loadCovidHarms();
  const text = harmCopy(file);
  const page = readFileSync("app/covid-vacciner-bivirkninger/page.tsx", "utf8");
  assert.equal(page.includes("Siden sorterer studierne efter, hvor godt fundet er dokumenteret."), true);
  assert.equal(file.groups.find((group) => group.id === "signal")?.title, "Signal");
  assert.equal(file.groups.find((group) => group.id === "signal")?.lead.includes("Kræver nærmere undersøgelse."), true);
  assert.equal(file.preface?.title, "1.000 referencer er ikke 1.000 målinger");
  assert.equal(text.includes("går under 1"), false);
  assert.equal(text.includes("rummer intervallet også ingen forskel"), true);
  assert.equal(text.includes("Kort: Risikoen er højest hos yngre mænd, efter anden dosis."), true);
  assert.equal(text.includes("Hverken Vaxzevria eller Jcovden er længere godkendt i EU, ifølge EMA's produktinformation."), true);
  assert.equal(text.split("længere godkendt").length - 1, 1);
  assert.equal(text.split("Rose og McCullough").length - 1, 1);
  assert.equal(text.split("Jiang").length - 1, 1);
  assert.equal(text.includes("Nygaards tal er"), false);
  assert.equal(text.includes("højst et signal, der kræver nærmere undersøgelse"), false);
  assert.equal(text.includes("pr. 10.000 i kilden"), false);
  assert.equal(text.includes("I kilden: 0,56 (0,37 til 0,74) pr. 10.000."), true);
});

test("Pottegårds arterielle forhold rummer 1", () => {
  const measure = loadCovidHarms()
    .findings.find((item) => item.id === "arterial")
    ?.measures[0];
  assert.ok(measure && measure.low! < 1 && measure.high! > 1);
  assert.equal(measureText(measure).includes("0,97 (0,77 til 1,20)"), true);
});
