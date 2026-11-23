import assert from "node:assert/strict";
import test from "node:test";
import { bannedPhrases, harmCopy, loadCovidHarms, measureText, per100k, perMillion } from "./covid-harms.ts";

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
  assert.equal(text.includes("ikke er talt op linje for linje"), true);
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
