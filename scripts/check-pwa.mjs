import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3847/indberettet";
const failures = [];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: "networkidle" });

const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
if (!manifestHref) failures.push("manifest-link mangler");
const manifestUrl = new URL(manifestHref, page.url()).href;
const manifest = await (await page.request.get(manifestUrl)).json();
if (manifest.name !== "Indberettet") failures.push(`navn er ${manifest.name}`);
if (!String(manifest.start_url).includes("/indberettet/")) failures.push(`start_url ${manifest.start_url}`);
if (!String(manifest.scope).includes("/indberettet")) failures.push(`scope ${manifest.scope}`);
if (manifest.display !== "standalone") failures.push(`display ${manifest.display}`);
const sizes = (manifest.icons ?? []).map((icon) => icon.sizes);
if (!sizes.includes("192x192") || !sizes.includes("512x512")) failures.push(`ikoner ${sizes.join(",")}`);
if (!(manifest.icons ?? []).some((icon) => String(icon.purpose).includes("maskable"))) failures.push("maskable ikon mangler");

await page.waitForTimeout(500);
const sw = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration("/indberettet/");
  return reg?.active?.scriptURL || reg?.installing?.scriptURL || reg?.waiting?.scriptURL || "none";
});
if (!String(sw).includes("/indberettet/sw.js")) failures.push(`service worker ${sw}`);

const apple = await page.locator('link[rel="apple-touch-icon"]').count();
if (apple < 1) failures.push("apple-touch-icon mangler");

await browser.close();
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Manifest og service worker er på plads.");
