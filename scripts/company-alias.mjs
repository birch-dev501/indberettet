const LETTER_PREFIX = new Set(["glaxo", "nova"]);

export function chooseShortTarget(companies, short) {
  if (!short || short.length < 3) return null;
  if (companies.some((item) => item.slug === short)) return null;
  if (LETTER_PREFIX.has(short)) {
    const rivals = companies.filter((item) => item.slug.startsWith(short));
    rivals.sort((a, b) => b.productRows - a.productRows || a.slug.localeCompare(b.slug, "da"));
    const [winner, next] = rivals;
    if (!winner || (next && next.productRows === winner.productRows)) return null;
    return winner.slug;
  }
  const exact = companies.filter((item) => item.slug.startsWith(`${short}-`));
  if (exact.length !== 1) return null;
  return exact[0].slug;
}
