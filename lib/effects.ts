import { polack } from "./sources.ts";

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

/** 1/ARR rounded to the nearest whole person. 8/18198 against 162/18325 is 119.04, which rounds to 119. */
export function roundedNnt(arr: number): number | null {
  if (!Number.isFinite(arr) || arr === 0) return null;
  return Math.round(1 / Math.abs(arr));
}

export function armMeasures(treatedEvents: number, treatedN: number, controlEvents: number, controlN: number) {
  if (treatedN <= 0 || controlN <= 0) return null;
  const treated = treatedEvents / treatedN;
  const control = controlEvents / controlN;
  const measures = effectMeasures(treated, control);
  if (!measures) return null;
  return {
    treated,
    control,
    arr: measures.arr,
    rrr: measures.rrr,
    nnt: measures.nnt === null ? null : roundedNnt(measures.arr),
  };
}

/** Polack et al., NEJM 2020, first primary endpoint. Counts are participants, not person-time. */
export const BNT162B2 = {
  vaccinatedCases: polack.vaccinatedCases,
  vaccinatedN: polack.vaccinatedN,
  placeboCases: polack.placeboCases,
  placeboN: polack.placeboN,
} as const;

export function trialRisks() {
  const treated = BNT162B2.vaccinatedCases / BNT162B2.vaccinatedN;
  const control = BNT162B2.placeboCases / BNT162B2.placeboN;
  return { treated, control, measures: effectMeasures(treated, control)! };
}

export type HarmInput = { risk: number };

/** Baseline and reaction risks are proportions. Efficacy is a fraction from 0 to 1. */
export function benefitHarm(baseline: number, efficacy: number, harms: HarmInput[]) {
  if (!Number.isFinite(baseline) || !Number.isFinite(efficacy)) return null;
  if (baseline < 0 || baseline > 1 || efficacy < 0 || efficacy > 1) return null;
  if (harms.some((harm) => !Number.isFinite(harm.risk) || harm.risk < 0 || harm.risk > 1)) return null;
  const prevented = baseline * efficacy;
  return {
    nnt: prevented > 0 ? 1 / prevented : null,
    preventedPer100k: prevented * 100_000,
    harms: harms.map((harm) => ({
      nnh: harm.risk > 0 ? 1 / harm.risk : null,
      causedPer100k: harm.risk * 100_000,
    })),
  };
}
