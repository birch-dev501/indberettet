import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { bannedPhrases, harmCopy, loadCovidHarms, measureText, per100k, perMillion } from "./covid-harms.ts";
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
  assert.equal(shown.includes("56 (37 til 74) pr. million"), true);
  assert.equal(shown.includes("(0,56 (0,37 til 0,74) pr. 10.000 i kilden)"), true);
  assert.equal(shown.split("pr. 10.000").length - 1, 1);
});

test("Fraimans samlede interval udelukker 0, de to forsøg hver for sig gør ikke", () => {
  const file = loadCovidHarms();
  const combined = file.findings.find((item) => item.id === "fraiman")?.measures.find((item) => item.id === "fraiman-combined");
  assert.ok(combined && combined.low! > 0);
  assert.equal(combined?.place.includes("minus 0,4"), true);
  assert.equal(combined?.place.includes("minus 3,6"), true);
});

test("Pottegårds arterielle forhold rummer 1", () => {
  const measure = loadCovidHarms()
    .findings.find((item) => item.id === "arterial")
    ?.measures[0];
  assert.ok(measure && measure.low! < 1 && measure.high! > 1);
  assert.equal(measureText(measure).includes("0,97 (0,77 til 1,20)"), true);
});
