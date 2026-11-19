import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3847/indberettet";
const failures = [];

async function typeStill(page, url, word) {
  await page.goto(url, { waitUntil: "networkidle" });
  const input = page.locator("input[role='searchbox']").first();
  await input.click();
  const start = await page.evaluate(() => window.scrollY);
  for (const letter of word) {
    await page.keyboard.type(letter, { delay: 40 });
    const state = await page.evaluate(() => ({
      y: window.scrollY,
      focused: document.activeElement instanceof HTMLInputElement && document.activeElement.getAttribute("role") === "searchbox",
    }));
    if (state.y !== start) failures.push(`${url} rykkede fra ${start} til ${state.y} ved «${word}»`);
    if (!state.focused) failures.push(`${url} mistede fokus i søgefeltet ved «${word}»`);
  }
  await page.waitForTimeout(200);
  const settled = await page.evaluate(() => window.scrollY);
  if (settled !== start) failures.push(`${url} rykkede til ${settled} efter søgningen faldt til ro`);
}

const browser = await chromium.launch();
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  await typeStill(page, `${base}/firma/`, "Merck");
  await typeStill(page, `${base}/katalog/`, "Merck");
  await typeStill(page, `${base}/`, "Merck");
  await page.close();
}
await browser.close();

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Søgefeltet beholdt fokus, og scrollY stod stille på firma, katalog og forsiden.");
