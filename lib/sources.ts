export function da(value: number, digits: number): string {
  return value.toLocaleString("da-DK", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const polack = {
  work: "Polack et al., New England Journal of Medicine 2020",
  url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2034577",
  place: "Abstract, Results. The abstract prints 8 and 162 cases and the credible interval. It does not print the efficacy-population denominators.",
  vaccinatedCases: 8,
  vaccinatedN: 18_198,
  placeboCases: 162,
  placeboN: 18_325,
  efficacy: 0.95,
  efficacyLow: 0.903,
  efficacyHigh: 0.976,
} as const;

export const karlstad = {
  work: "Karlstad et al., JAMA Cardiology 2022",
  url: "https://jamanetwork.com/journals/jamacardiology/fullarticle/2791253",
  pmc: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9021987/",
  men16to24BntDose2: {
    excessPer100k: 5.55,
    low: 3.7,
    high: 7.39,
    table: "Table 2",
    row: "Myocarditis, males 16-24 years, BNT162b2/BNT162b2",
  },
  men16to24MrnaDose2: {
    excessPer100k: 18.39,
    low: 9.05,
    high: 27.72,
    table: "Table 2",
    row: "Myocarditis, males 16-24 years, mRNA-1273/mRNA-1273",
  },
  men16to24BntDose1: {
    excessPer100k: 1.55,
    low: 0.7,
    high: 2.39,
    table: "Table 2",
    row: "Myocarditis, males 16-24 years, BNT162b2",
  },
  men40BntTwoDoses: {
    excessPer100k: 0.05,
    low: -0.19,
    high: 0.28,
    table: "Table 2",
    row: "Myocarditis, males 40 years or older, BNT162b2/BNT162b2",
  },
} as const;

export const husby = {
  work: "Husby et al., BMJ 2021",
  url: "https://www.bmj.com/content/375/bmj-2021-068665",
  place: "Results. Each rate is stored with its interval, and each hazard ratio is stored with its interval.",
  cohort: 4_931_775,
  bntRate: { per100k: 1.4, low: 1.0, high: 1.8 },
  bntHr: { value: 1.34, low: 0.9, high: 2.0 },
  bntYoungRate: { per100k: 1.6, low: 1.0, high: 2.6 },
  bntYoungHr: { value: 1.48, low: 0.74, high: 2.98 },
  modernaRate: { per100k: 4.2, low: 2.6, high: 6.4 },
  modernaHr: { value: 3.92, low: 2.3, high: 6.68 },
  modernaYoungRate: { per100k: 5.7, low: 3.3, high: 9.3 },
  modernaYoungHr: { value: 5.24, low: 2.47, high: 11.12 },
} as const;

/** Dinnes et al., Cochrane Database Syst Rev. 2022 Jul 22;2022(7):CD013705.
 * Summary of findings 1. Symptomatic and Asymptomatic are separate rows.
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC9305720/
 */
export const cochraneAntigen = {
  sourceName: "Dinnes et al., Cochrane Database of Systematic Reviews 2022",
  sourceUrl: "https://doi.org/10.1002/14651858.CD013705.pub3",
  table: "Summary of findings 1",
  symptomaticRow: "Symptomatic",
  symptomaticSensitivity: 0.73,
  symptomaticSensitivityLow: 0.693,
  symptomaticSensitivityHigh: 0.764,
  symptomaticSpecificity: 0.991,
  symptomaticSpecificityLow: 0.99,
  symptomaticSpecificityHigh: 0.992,
  symptomaticEvaluations: 109,
  symptomaticSamples: 50_574,
  symptomaticCases: 11_662,
  asymptomaticRow: "Asymptomatic",
  asymptomaticSensitivity: 0.547,
  asymptomaticSensitivityLow: 0.477,
  asymptomaticSensitivityHigh: 0.616,
  asymptomaticSpecificity: 0.995,
  asymptomaticSpecificityLow: 0.994,
  asymptomaticSpecificityHigh: 0.996,
  asymptomaticEvaluations: 50,
  asymptomaticSamples: 40_956,
  asymptomaticCases: 2_641,
} as const;
