export function samePageLink(href: string, pagePath: string): boolean {
  if (href.startsWith("#")) return true;
  try {
    const next = new URL(href, "https://indberettet.local");
    const current = new URL(pagePath, "https://indberettet.local");
    return next.pathname === current.pathname;
  } catch {
    return false;
  }
}

export function closesSearchOnPointer(inside: boolean, href: string | null, pagePath: string): boolean {
  if (inside) return false;
  if (href === null) return true;
  return samePageLink(href, pagePath);
}
