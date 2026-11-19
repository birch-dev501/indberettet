export type PenaltyCase = {
  company: string;
  offense: string;
  year: number;
  agency: string;
  amountUsd: number;
  url: string;
  duplicate?: boolean;
};

export type OffenseTotal = {
  type: string;
  totalUsd: number;
  count: number;
};

export type ViolationRecord = {
  parentName: string;
  parentUrl: string;
  penaltyTotalUsd: number;
  recordCount: number;
  topOffenseTypes: OffenseTotal[];
  largest: PenaltyCase[];
  recent?: PenaltyCase[];
};

export type ViolationFile = {
  source: string;
  sourceName: string;
  fetchedAt: string;
  note: string;
  firms: Record<string, ViolationRecord>;
};

export const VIOLATION_NOTE =
  "Tallene dækker især amerikansk håndhævelse og kun en del sager fra Storbritannien og EU. De er samlet af Good Jobs First og handler om selskabet, ikke om sikkerheden ved et bestemt lægemiddel.";

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
