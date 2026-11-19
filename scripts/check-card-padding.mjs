import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3847/indberettet";
const pages = ["/", "/stof/covid-19-vaccines/", "/firma/", "/firma/novo-nordisk/", "/katalog/", "/kategori/", "/kategori/statiner/", "/forstaa-forskning/"];
const failures = [];

const viewports = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
];

const browser = await chromium.launch();

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  for (const path of pages) {
    const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    if (!response || response.status() >= 400) {
      failures.push(`${viewport.width} ${path} svarer ${response ? response.status() : "uden svar"}`);
      continue;
    }
    const result = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const close = [];
      const clip = (rect, el, card) => {
        let left = rect.left;
        let right = rect.right;
        let top = rect.top;
        let bottom = rect.bottom;
        let node = el.parentElement;
        while (node && node !== card.parentElement) {
          const style = getComputedStyle(node);
          if (/(auto|scroll|hidden|clip)/.test(style.overflow + style.overflowX + style.overflowY)) {
            const box = node.getBoundingClientRect();
            left = Math.max(left, box.left);
            right = Math.min(right, box.right);
            top = Math.max(top, box.top);
            bottom = Math.min(bottom, box.bottom);
          }
          node = node.parentElement;
        }
        return { left, right, top, bottom };
      };
      for (const card of document.querySelectorAll(".card, .caveat")) {
        const box = card.getBoundingClientRect();
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const textNode = walker.currentNode;
          if (textNode.parentElement?.closest(".sr-only, details:not([open])")) continue;
          const text = textNode.textContent.replace(/\s+/g, " ").trim();
          if (text.length < 2) continue;
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of range.getClientRects()) {
            const visible = clip(rect, textNode.parentElement, card);
            if (visible.right - visible.left < 1 || visible.bottom - visible.top < 1) continue;
            const gap = Math.min(visible.left - box.left, box.right - visible.right, visible.top - box.top, box.bottom - visible.bottom);
            if (gap < 12) {
              close.push(`${text.slice(0, 42)} (${Math.round(gap)}px)`);
              if (close.length > 6) return { overflow, close };
            }
          }
        }
      }
      return { overflow, close };
    });
    if (result.overflow > 1) failures.push(`${viewport.width} ${path} er ${result.overflow}px for bred`);
    if (result.close.length) failures.push(`${viewport.width} ${path}: tekst for tæt på kortkanten: ${result.close.join("; ")}`);
  }
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Kort har mindst 12px luft, og ingen side ruller vandret ved 360px.");
