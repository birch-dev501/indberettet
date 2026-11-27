const DEFAULT_BASE_PATH = "/indberettet";

export function siteBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? DEFAULT_BASE_PATH;
}

export function isSitePath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export function sitePathHref(href: string): string {
  if (!isSitePath(href)) return href;
  const base = siteBasePath().replace(/\/$/, "");
  const suffixIndex = href.search(/[?#]/);
  const path = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : href.slice(suffixIndex);
  const prefixed = !base || path === base || path.startsWith(`${base}/`) ? path : `${base}${path}`;
  const withSlash = prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
  return `${withSlash}${suffix}`;
}
