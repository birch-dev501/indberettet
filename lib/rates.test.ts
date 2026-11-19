import assert from "node:assert/strict";
import test from "node:test";
import { MIN_USERS, RATE_DISCLAIMER, isCompleteYear, substanceRate, type UsageFile } from "./rates.ts";

const usage: UsageFile = {
  ok: true,
  fetchedAt: "2026-11-18T00:00:00Z",
  latestMonth: "2026-09",
  sourceName: "Medicinsalg i primærsektoren",
  sourceUrl: "https://sundhedsdatabank.dk/medicin/medicinsalg-og-udgifter-menu/medicinsalg",
  medstatUrl: "https://medstat.dk/",
  register: "Lægemiddelstatistikregisteret",
  byAtc: {
    A10BJ06: { "2020": 40000, "2021": 500, "2022": 80000, "2026": 90000 },
    J07BB02: { "2024": 200000 },
    C10AA01: { "2024": 100000 },
    N02BE01: { "2024": 100000, "2025": 100000 },
  },
};

test("raten bruger kun hele år med mindst 1000 brugere", () => {
  const rate = substanceRate({
    atcs: ["A10BJ06"],
    reportYears: [
      { year: 2020, reports: 100 },
      { year: 2022, reports: 400 },
      { year: 2026, reports: 900 },
    ],
    usage,
  });
  assert.ok(rate);
  assert.deepEqual(rate.years.map((row) => row.year), [2020, 2022]);
  assert.equal(rate.reports, 500);
  assert.equal(rate.users, 120000);
  assert.equal(rate.per10k, (500 / 120000) * 10000);
  assert.ok(rate.years.every((row) => row.users >= MIN_USERS));
});

test("et manglende år i udtrækket tæller som nul indberetninger", () => {
  const rate = substanceRate({
    atcs: ["N02BE01"],
    reportYears: [
      { year: 2024, reports: 200 },
      { year: 2026, reports: 50 },
    ],
    usage,
  });
  assert.equal(rate?.years.length, 2);
  assert.equal(rate?.years[1].reports, 0);
});

test("vacciner og flertydige ATC-koder får ingen rate", () => {
  assert.equal(
    substanceRate({ atcs: ["J07BB02"], reportYears: [{ year: 2024, reports: 10 }], usage }),
    null,
  );
  assert.equal(
    substanceRate({
      atcs: ["C10AA01", "C10AA05"],
      reportYears: [{ year: 2024, reports: 10 }],
      usage,
    }),
    null,
  );
  assert.equal(substanceRate({ atcs: ["A10BJ06"], reportYears: [{ year: 2020, reports: 1 }], usage: null }), null);
});

test("et ufuldstændigt år er ikke et helt år", () => {
  assert.equal(isCompleteYear(2025, "2026-09"), true);
  assert.equal(isCompleteYear(2026, "2026-09"), false);
  assert.equal(isCompleteYear(2026, "2026-12"), true);
});

test("forbeholdet står ved raten og kalder den ikke en hyppighed", () => {
  assert.match(RATE_DISCLAIMER, /indberetningsrate/);
  assert.match(RATE_DISCLAIMER, /ikke en risiko/);
  assert.match(RATE_DISCLAIMER, /ikke en hyppighed/);
  assert.match(RATE_DISCLAIMER, /underrapportering/);
  assert.match(RATE_DISCLAIMER, /medieomtale/);
  assert.match(RATE_DISCLAIMER, /kampagner/);
  assert.match(RATE_DISCLAIMER, /flere lægemidler/);
  assert.match(RATE_DISCLAIMER, /sygehusbrug/);
  assert.match(RATE_DISCLAIMER, /vaccinationer/);
  assert.match(RATE_DISCLAIMER, /Sammenlign ikke/);
  assert.match(RATE_DISCLAIMER, /ikke nødvendigvis forårsaget af medicinen/);
  assert.match(RATE_DISCLAIMER, /sygdommen selv/);
  assert.match(RATE_DISCLAIMER, /årsagen er ikke fastslået/);
  assert.equal(RATE_DISCLAIMER.includes("1 ud af"), false);
});
