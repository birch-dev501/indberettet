/** Counts per tested people. Rows and columns sum because the remainder is the difference. */
export type BayesCounts = {
  tested: number;
  prevalence: number;
  sensitivity: number;
  specificity: number;
  sick: number;
  well: number;
  truePositive: number;
  falseNegative: number;
  trueNegative: number;
  falsePositive: number;
  ppv: number | null;
  npv: number | null;
};

export function bayesCounts(
  tested: number,
  prevalence: number,
  sensitivity: number,
  specificity: number,
): BayesCounts | null {
  if (!Number.isInteger(tested) || tested < 1) return null;
  if (![prevalence, sensitivity, specificity].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
    return null;
  }
  const sick = Math.round(tested * prevalence);
  const well = tested - sick;
  const truePositive = Math.round(sick * sensitivity);
  const falseNegative = sick - truePositive;
  const trueNegative = Math.round(well * specificity);
  const falsePositive = well - trueNegative;
  const positive = truePositive + falsePositive;
  const negative = trueNegative + falseNegative;
  return {
    tested,
    prevalence,
    sensitivity,
    specificity,
    sick,
    well,
    truePositive,
    falseNegative,
    trueNegative,
    falsePositive,
    ppv: positive === 0 ? null : truePositive / positive,
    npv: negative === 0 ? null : trueNegative / negative,
  };
}

/** Dinnes et al., Cochrane Database of Systematic Reviews 2022, issue 7, CD013705. */
export const COCHRANE_ANTIGEN = {
  sourceName: "Dinnes et al., Cochrane Database of Systematic Reviews 2022",
  sourceUrl: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD013705.pub3/full",
  symptomaticSensitivity: 0.73,
  symptomaticSpecificity: 0.991,
  asymptomaticSensitivity: 0.547,
  asymptomaticSpecificity: 0.997,
} as const;

export const TESTED = 10_000;

export const LOW_PREVALENCE = bayesCounts(
  TESTED,
  0.001,
  COCHRANE_ANTIGEN.asymptomaticSensitivity,
  COCHRANE_ANTIGEN.asymptomaticSpecificity,
)!;

export const HIGH_PREVALENCE = bayesCounts(
  TESTED,
  0.2,
  COCHRANE_ANTIGEN.symptomaticSensitivity,
  COCHRANE_ANTIGEN.symptomaticSpecificity,
)!;
