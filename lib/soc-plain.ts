/** Short Danish names for the MedDRA organ classes already present in DKMA's files. */
export const SOC_PLAIN: Record<string, string> = {
  Blood: "Blod og lymfe",
  Card: "Hjerte",
  Cong: "Medfødte sygdomme",
  Ear: "Øre",
  Endo: "Hormoner",
  Eye: "Øjne",
  Gastr: "Mave og tarm",
  Genrl: "Generelle symptomer og reaktioner på injektionsstedet",
  Hepat: "Lever",
  Immun: "Immunsystem",
  Infec: "Infektioner",
  "Inj&P": "Skader og forgiftninger",
  Inv: "Undersøgelser",
  Metab: "Stofskifte",
  Musc: "Knogler, led og muskler",
  Neopl: "Tumorer",
  Nerv: "Nervesystem",
  Preg: "Graviditet",
  Prod: "Produktfejl",
  Psych: "Psykiske symptomer",
  Renal: "Nyrer og urinveje",
  Repro: "Kønsorganer og bryst",
  Resp: "Luftveje",
  Skin: "Hud",
  SocCi: "Sociale forhold",
  Surg: "Operationer og procedurer",
  Vasc: "Blodkar",
};

export function plainSoc(abbrev: string, fallback: string): string {
  return SOC_PLAIN[abbrev] ?? fallback.replace(/\s*\([^)]*\)\s*$/, "");
}
