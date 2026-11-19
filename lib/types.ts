export type CountRow = {
  key: string;
  label: string;
  reports: number;
};

export type AgeRow = {
  band: string | null;
  label: string;
  reports: number;
};

export type YearRow = {
  year: number;
  nonserious: number;
  serious: number;
  fatal: number;
  reports: number;
};

export type RouteRow = {
  key: string;
  label: string;
  administrations: number;
  reports: number;
};

export type SocRow = {
  abbrev: string;
  label: string;
  reactions: number;
  reports: number;
  fatalReactions: number;
};

export type TermRow = {
  pt: string;
  soc: string;
  reactions: number;
  reports: number;
  fatalReactions: number;
};

export type SubstanceView = {
  reports: number;
  reactions: number;
  fatalReactions: number;
  sex: CountRow[];
  age: AgeRow[];
  years: YearRow[];
  reporters: CountRow[];
  routes: RouteRow[];
  soc: SocRow[];
  terms: TermRow[];
};

export type Substance = {
  slug: string;
  id: string;
  name: string;
  sourceName: string;
  showcase: boolean;
  stale?: boolean;
  staleReason?: string;
  zipPath: string;
  zipUrl: string;
  sourcePage: string;
  zipSha256: string;
  dataExtractionDate: string;
  meddraVersion: string;
  reportType: string;
  country: string;
  extractVersion: string;
  approvedProductCount: number;
  brands: string[];
  productNames: { single: string[]; multi: string[] };
  views: {
    all: SubstanceView;
    N: SubstanceView;
    S: SubstanceView;
    F: SubstanceView;
  };
};

export type NewsItem = {
  title: string;
  date: string;
  dateLabel: string;
  excerpt: string;
  url: string;
};

export type SubstanceSummary = {
  slug: string;
  id: string;
  name: string;
  sourceName: string;
  showcase: boolean;
  stale: boolean;
  reports: number;
  reactions: number;
  seriousReports: number;
  fatalReports: number;
  dataExtractionDate: string;
  topTerm: string | null;
  brands: string[];
  approvedProductCount: number;
};

export type DataIndex = {
  generatedAt: string;
  dataExtractionDateMin: string | null;
  dataExtractionDateMax: string | null;
  substances: SubstanceSummary[];
};

export type ProductRecord = {
  drugId: string;
  name: string;
  form: string;
  strength: string;
  atc: string;
  holder: string;
  slugs: string[];
  status: "covered" | "partial" | "uncovered";
};

export type DataStatus = {
  ok: boolean;
  generatedAt: string;
  listUrl: string;
  indexUrl: string;
  list: { spreadsheetCreated?: string; productRows: number };
  catalogCount: number;
  uniqueSubstanceTokens: number;
  matchedTokens: number;
  unmatchedTokens: number;
  attemptedZips: number;
  succeeded: number;
  failed: { id: string; name: string; reason: string; kind: string; retainedPrevious?: boolean }[];
  products: { rows: number; covered: number; partial: number; uncovered: number };
  dataExtractionDateMin: string | null;
  dataExtractionDateMax: string | null;
  showcases: string[];
};
