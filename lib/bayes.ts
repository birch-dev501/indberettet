import { cochraneAntigen as COCHRANE_ANTIGEN } from "./sources.ts";

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

export { COCHRANE_ANTIGEN };

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
