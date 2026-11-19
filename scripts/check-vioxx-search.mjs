import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3847/indberettet";
const failures = [];

const browser = await chromium.launch();
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${base}/katalog/`, { waitUntil: "networkidle" });
  const input = page.locator("input[role='searchbox']").first();
  for (const word of ["Vioxx", "viox"]) {
    await input.fill("");
    await input.fill(word);
    const hit = page.locator("a", { hasText: "Vioxx" }).first();
    try {
      await hit.waitFor({ timeout: 8000 });
    } catch {
      failures.push(`${viewport.width}px: «${word}» gav intet Vioxx-resultat`);
      continue;
    }
    const text = (await hit.innerText()).replace(/\s+/g, " ");
    const href = await hit.getAttribute("href");
    if (!/Vioxx/.test(text) || !/MSD/.test(text)) failures.push(`${viewport.width}px: «${word}» viste «${text}»`);
    if (!href?.includes("/firma/msd") || !href.includes("#sag-")) {
      failures.push(`${viewport.width}px: «${word}» linkede til ${href}`);
    }
  }
  await page.close();
}
await browser.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Vioxx og viox finder MSD-bødesagen.");
