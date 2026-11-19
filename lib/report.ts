const REPO = "https://github.com/birch-dev501/indberettet";
export const PUBLIC_SITE = "https://birch-dev501.github.io/indberettet";

export const REPORT_NOTE = "GitHub-konto kræves. Sagen er offentlig. Skriv ikke personlige helbredsoplysninger.";

export function reportChooserHref(): string {
  return `${REPO}/issues/new/choose`;
}

export function reportPageHref(path: string): string {
  const page = `${PUBLIC_SITE}${path.startsWith("/") ? path : `/${path}`}`;
  const params = new URLSearchParams({
    template: "fejl-i-data.yml",
    title: `Fejl på ${path}`,
    side: page,
  });
  return `${REPO}/issues/new?${params.toString()}`;
}
