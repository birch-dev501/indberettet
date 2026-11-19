/** Risks are proportions between 0 and 1. ARR is control minus treated. */
export type EffectMeasures = {
  arr: number;
  rrr: number | null;
  nnt: number | null;
  nnh: number | null;
};

export function effectMeasures(treated: number, control: number): EffectMeasures | null {
  if (!Number.isFinite(treated) || !Number.isFinite(control)) return null;
  if (treated < 0 || control < 0 || treated > 1 || control > 1) return null;
  const arr = control - treated;
  const rrr = control === 0 ? null : arr / control;
  if (arr > 0) return { arr, rrr, nnt: 1 / arr, nnh: null };
  if (arr < 0) return { arr, rrr, nnt: null, nnh: 1 / -arr };
  return { arr: 0, rrr: rrr === null ? null : 0, nnt: null, nnh: null };
}

/** Polack et al., NEJM 2020, first primary endpoint. Counts are participants, not person-time. */
export const BNT162B2 = {
  vaccinatedCases: 8,
  vaccinatedN: 18198,
  placeboCases: 162,
  placeboN: 18325,
} as const;

export function trialRisks() {
  const treated = BNT162B2.vaccinatedCases / BNT162B2.vaccinatedN;
  const control = BNT162B2.placeboCases / BNT162B2.placeboN;
  return { treated, control, measures: effectMeasures(treated, control)! };
}
