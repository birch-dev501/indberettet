import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3847/indberettet";
const failures = [];
const both = ["Merck", "merk", "Merck & Co", "Merck Sharp & Dohme"];

async function boxes(page) {
  const found = [];
  for (const selector of ["search[data-search=header]", "search[data-search=page]"]) {
    const locator = page.locator(selector);
    if ((await locator.count()) > 0) found.push(locator.first());
  }
  return found;
}

async function readResults(box, includes, excludes = []) {
  const list = box.locator(".result-groups");
  await list.waitFor({ timeout: 8000 });
  let text = "";
  const start = Date.now();
  while (Date.now() - start < 4000) {
    text = (await list.innerText()).replace(/\s+/g, " ");
    if (includes.every((part) => text.includes(part)) && excludes.every((part) => !text.includes(part))) return text;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return text;
}

const browser = await chromium.launch();
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  for (const path of ["/", "/katalog/", "/firma/"]) {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    const inputs = await boxes(page);
    const minimum = path === "/" ? 2 : 1;
    if (inputs.length < minimum) failures.push(`${viewport.width}px ${path}: fandt ${inputs.length} søgefelter`);
    for (const box of inputs) {
      const input = box.locator("input[role=searchbox]");
      for (const word of both) {
        await input.fill("");
        await input.fill(word);
        let text = "";
        try {
          text = await readResults(box, ["USA og Canada", "Tysk Merck"]);
        } catch {
          failures.push(`${viewport.width}px ${path} «${word}»: ingen resultatliste`);
          continue;
        }
        if (!/MSD \(Merck Sharp & Dohme\)/.test(text) || !/USA og Canada/.test(text)) {
          failures.push(`${viewport.width}px ${path} «${word}» mangler MSD-forklaring: ${text.slice(0, 180)}`);
        }
        if (!/Merck \(Merck KGaA\)/.test(text) || !/Tysk Merck/.test(text)) {
          failures.push(`${viewport.width}px ${path} «${word}» mangler tysk Merck: ${text.slice(0, 180)}`);
        }
      }
      await input.fill("");
      await input.fill("MSD");
      let text = "";
      try {
        text = await readResults(box, ["MSD (Merck Sharp & Dohme)"], ["Tysk Merck"]);
      } catch {
        failures.push(`${viewport.width}px ${path} «MSD»: ingen resultatliste`);
        continue;
      }
      if (!/MSD \(Merck Sharp & Dohme\)/.test(text)) failures.push(`${viewport.width}px ${path} «MSD» fandt ikke MSD`);
      if (/Tysk Merck/.test(text)) failures.push(`${viewport.width}px ${path} «MSD» viste også tysk Merck`);
    }
  }
  await page.close();
}
await browser.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Merck viser både MSD og tysk Merck i alle søgefelter. MSD viser kun MSD.");
