import { editDistance, fold } from "./search.ts";

export type CompanyFilterRow = {
  slug: string;
  label: string;
  aliases: string[];
  productRows: number;
  substanceCount: number;
};

function wordsOf(value: string): string[] {
  return value.split(/[^a-z0-9]+/).filter((word) => word.length > 0);
}

/** Higher is better. 0 means no match. Prefix on the normalised name outranks aliases. */
export function companyRank(query: string, row: CompanyFilterRow): number {
  const needle = fold(query.trim());
  if (!needle) return 1;
  const name = fold(row.label);
  const aliases = [...new Set(row.aliases.map((alias) => fold(alias)).filter(Boolean))];
  const pool = [name, ...aliases];
  if (name.startsWith(needle)) return 400;
  const words = pool.flatMap(wordsOf);
  if (words.some((word) => word.startsWith(needle))) return 300;
  if (pool.some((value) => value.includes(needle))) return 200;
  const limit = needle.length >= 8 ? 2 : needle.length >= 4 ? 1 : 0;
  if (limit === 0) return 0;
  const near = pool.some((value) => editDistance(needle, value, limit) <= limit);
  const wordNear = words.some((word) => word.length >= 4 && editDistance(needle, word, limit) <= limit);
  return near || wordNear ? 100 : 0;
}

export function filterCompanies(query: string, rows: CompanyFilterRow[]): CompanyFilterRow[] {
  const needle = query.trim();
  if (!needle) return rows;
  return rows
    .map((row) => ({ row, rank: companyRank(needle, row) }))
    .filter((item) => item.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.row.label.localeCompare(b.row.label, "da"))
    .map((item) => item.row);
}
