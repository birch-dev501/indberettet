import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3847/indberettet";
const paths = [
  "/",
  "/katalog/",
  "/stof/semaglutide/",
  "/stof/covid-19-vaccines/",
  "/kategori/",
  "/kategori/statiner/",
  "/firma/",
  "/firma/novo-nordisk/",
  "/firma/pfizer/",
  "/om-data/",
  "/sygdom/",
  "/sygdom/diabetes/",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
const failures = [];

for (const path of paths) {
  const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  if (!response || response.status() >= 400) {
    failures.push(`${path} svarer ${response ? response.status() : "uden svar"}`);
    continue;
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) failures.push(`${path} er ${overflow}px for bred`);
}

await page.goto(`${base}/katalog/`, { waitUntil: "networkidle" });
await page.locator("input[role='searchbox']").fill("novo");
await page.waitForTimeout(300);
const searchOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
if (searchOverflow > 1) failures.push(`/katalog/ med søgeresultat er ${searchOverflow}px for bred`);

await browser.close();
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Ingen vandret overflow ved 360px på ${paths.length} sider og i søgningen.`);
