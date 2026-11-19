import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3847/indberettet";
const failures = [];
const browser = await chromium.launch();
for (const viewport of [
  { width: 360, height: 800 },
  { width: 1280, height: 900 },
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${base}/stof/covid-19-vaccines/`, { waitUntil: "networkidle" });
  const box = page.locator("#foretrukne-termer .table-scroll");
  await box.scrollIntoViewIfNeeded();
  const before = await box.locator("tbody tr").nth(8).boundingBox();
  await box.evaluate((element) => {
    element.scrollTop = 280;
  });
  const head = await box.locator("thead th").first().boundingBox();
  const wrap = await box.boundingBox();
  const after = await box.locator("tbody tr").nth(8).boundingBox();
  if (!head || !wrap || !before || !after) {
    failures.push(`${viewport.width}: manglede mål`);
    continue;
  }
  if (Math.abs(head.y - wrap.y) > 4) failures.push(`${viewport.width}: overskrift y ${head.y} wrap ${wrap.y}`);
  if (after.y >= before.y) failures.push(`${viewport.width}: rækken rykkede ikke`);
}
await browser.close();
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Tabeloverskriften blev stående ved scroll.");
