import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = join(root, "out");
const evidence = join(root, ".verify", "evidence");
const port = Number(process.env.VERIFY_PORT ?? 39241);
const origin = `http://127.0.0.1:${port}`;
const base = `${origin}/indberettet`;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(message);
}

function serve() {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", origin);
    let pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith("/indberettet")) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    pathname = pathname.slice("/indberettet".length) || "/";
    const file = join(outDir, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    try {
      const body = readFileSync(file);
      response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("not found");
    }
  });
  return new Promise((ready, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => ready(server));
  });
}

function build() {
  return new Promise((ready, reject) => {
    const child = spawn("npm", ["run", "build"], { cwd: root, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "/indberettet" } });
    child.on("exit", (code) => (code === 0 ? ready() : reject(new Error(`build exited ${code}`))));
  });
}

async function doctor() {
  const response = await fetch(`${base}/`);
  const text = await response.text();
  if (response.status !== 200 || !text.includes("Indberettet")) {
    throw new Error(`doctor: forside svarer ${response.status}`);
  }
}

async function groups(page) {
  const box = page.locator("search[data-search=header]");
  await box.locator(".result-groups").waitFor({ timeout: 8000 });
  return (await box.locator(".result-groups").innerText()).replace(/\s+/g, " ");
}

async function search(page, query) {
  const input = page.locator("search[data-search=header] input[role=searchbox]");
  await input.fill("");
  await input.fill(query);
  return groups(page);
}

async function checkSearch(page, width) {
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const queries = {
    vioxx: ["Vioxx", "Bødesager", "MSD"],
    viox: ["Vioxx", "Bødesager"],
    bextra: ["Bextra", "Bødesager", "Pfizer"],
    pfizer: ["Pfizer", "Bødesager", "Bextra"],
    oxycodon: ["oxycodon", "Bødesager", "OxyContin"],
  };
  for (const [query, parts] of Object.entries(queries)) {
    const text = await search(page, query);
    for (const part of parts) {
      if (!text.toLowerCase().includes(part.toLowerCase())) fail(`${width} søg «${query}» mangler «${part}»`);
    }
  }
  const merck = await search(page, "merck");
  if (!merck.includes("MSD (Merck Sharp & Dohme)") || !merck.includes("USA og Canada")) fail(`${width} merck mangler MSD`);
  if (!merck.includes("Merck (Merck KGaA)") || !merck.includes("Tysk Merck")) fail(`${width} merck mangler tysk Merck`);
  const msd = await search(page, "MSD");
  if (!msd.includes("MSD (Merck Sharp & Dohme)")) fail(`${width} MSD mangler MSD`);
  if (msd.includes("Tysk Merck")) fail(`${width} MSD viser tysk Merck`);
  await page.screenshot({ path: join(evidence, `soegning-${width}.png`) });
}

async function checkSearchPage(page, width) {
  await page.goto(`${base}/soeg/?q=Pfizer`, { waitUntil: "networkidle" });
  const chips = page.getByRole("tablist", { name: "Afgræns typen" });
  await chips.waitFor();
  if (!(await chips.innerText()).includes("Bødesager")) fail(`${width} /soeg/ mangler filteret Bødesager`);
  await page.getByRole("button", { name: /Bødesager/ }).click();
  const text = (await page.locator(".result-groups").innerText()).replace(/\s+/g, " ");
  if (!text.includes("Bextra")) fail(`${width} /soeg/ Bødesager viser ikke Bextra`);
  if (/Stoffer\s+\d/.test(text)) fail(`${width} /soeg/ filteret gemmer ikke de andre grupper`);
  await page.screenshot({ path: join(evidence, `soeg-${width}.png`) });
}

async function checkReactions(page, width) {
  await page.goto(`${base}/stof/covid-19-vaccines/`, { waitUntil: "networkidle" });
  const section = page.locator("#reaktionstyper");
  const button = section.locator("button").first();
  await button.click();
  if ((await button.getAttribute("aria-expanded")) !== "true") fail(`${width} organklasse åbner ikke`);
  const link = section.locator(".soc-detail a").first();
  await link.waitFor();
  const href = await link.getAttribute("href");
  if (!href || href.includes("?q=")) fail(`${width} organklasse-link er ${href}`);
  const termLinks = await page.locator("a.term-link").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
  if (termLinks.some((href) => href.includes("?q="))) fail(`${width} et bivirkningslink bruger ?q=`);
  await page.locator("#foretrukne-termer input").fill("Thrombocytopenia");
  const row = page.locator("#foretrukne-termer tr", { hasText: "Blodplademangel" });
  await row.waitFor();
  const platelet = await row.locator("a").first().getAttribute("href");
  if (!platelet?.includes("blodplademangel") || platelet.includes("purpura")) fail(`${width} trombocytopeni linker til ${platelet}`);
}

async function checkFines(page, width) {
  await page.goto(`${base}/firma/msd/`, { waitUntil: "networkidle" });
  const text = await page.locator("#boeder").innerText();
  if (!text.includes("Vioxx")) fail(`${width} MSD-siden viser ikke Vioxx`);
  await page.locator("#boeder").screenshot({ path: join(evidence, `boeder-${width}.png`) });
}

async function checkCalculator(page, width) {
  await page.goto(`${base}/forstaa-forskning/#nnh`, { waitUntil: "networkidle" });
  const card = page.locator("#nnh");
  const before = await card.locator(".balance-list li").count();
  await card.getByRole("button", { name: "Tilføj reaktion" }).click();
  await card.getByRole("button", { name: "Tilføj reaktion" }).click();
  const after = await card.locator(".balance-list li").count();
  if (after !== before + 2) fail(`${width} beregneren gik fra ${before} til ${after} reaktioner`);
  const risks = card.locator(".harm-row").nth(after - 1).getByLabel("Risikotal");
  await risks.fill("1000");
  await card.locator(".balance-list li").nth(after - 1).getByText("1.000").waitFor();
  await card.screenshot({ path: join(evidence, `beregner-${width}.png`) });
}

async function checkSticky(page, width) {
  await page.goto(`${base}/stof/covid-19-vaccines/`, { waitUntil: "networkidle" });
  const box = page.locator("#foretrukne-termer .table-scroll");
  await box.scrollIntoViewIfNeeded();
  const before = await box.locator("tbody tr").nth(6).boundingBox();
  await box.evaluate((element) => {
    element.scrollTop = 240;
  });
  const head = await box.locator("thead th").first().boundingBox();
  const wrap = await box.boundingBox();
  const after = await box.locator("tbody tr").nth(6).boundingBox();
  if (!head || !wrap || !before || !after) {
    fail(`${width} tabeloverskrift kunne ikke måles`);
    return;
  }
  if (Math.abs(head.y - wrap.y) > 4) fail(`${width} overskrift rykkede (${Math.round(head.y)} mod ${Math.round(wrap.y)})`);
  if (after.y >= before.y) fail(`${width} tabelrækken rykkede ikke`);
  await box.screenshot({ path: join(evidence, `tabel-${width}.png`) });
}

async function checkLayout(page, width) {
  const paths = ["/", "/stof/covid-19-vaccines/", "/firma/msd/", "/katalog/", "/forstaa-forskning/", "/boedesager/"];
  for (const path of paths) {
    const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    if (!response || response.status() >= 400) {
      fail(`${width} ${path} svarer ${response ? response.status() : "uden svar"}`);
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
            if (gap < 12) close.push(`${text.slice(0, 32)} (${Math.round(gap)}px)`);
          }
        }
      }
      return { overflow, close: close.slice(0, 4) };
    });
    if (width <= 390 && result.overflow > 1) fail(`${width} ${path} er ${result.overflow}px for bred`);
    if (result.close.length) fail(`${width} ${path}: tekst for tæt på kortkanten: ${result.close.join("; ")}`);
  }
}

async function checkPwa(page) {
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  if (!manifestHref) {
    fail("manifest-link mangler");
    return;
  }
  const manifest = await (await page.request.get(new URL(manifestHref, page.url()).href)).json();
  if (manifest.name !== "Indberettet") fail(`manifest-navn ${manifest.name}`);
  if (!String(manifest.start_url).includes("/indberettet/")) fail(`start_url ${manifest.start_url}`);
  if (manifest.display !== "standalone") fail(`display ${manifest.display}`);
  const sw = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "unsupported";
    const reg = await navigator.serviceWorker.getRegistration("/indberettet/");
    return reg?.active?.scriptURL || reg?.installing?.scriptURL || reg?.waiting?.scriptURL || "none";
  });
  if (!String(sw).includes("/indberettet/sw.js")) fail(`service worker ${sw}`);
}

async function checkReport(page) {
  await page.goto(`${base}/stof/covid-19-vaccines/`, { waitUntil: "networkidle" });
  const href = await page.getByRole("link", { name: "Meld fejl på denne side" }).getAttribute("href");
  if (!href?.includes("github.com/birch-dev501/indberettet/issues/new")) fail(`meld-fejl linker til ${href}`);
  if (!href.includes("stof")) fail("meld-fejl udfylder ikke siden");
  const footer = await page.getByRole("link", { name: "Fandt du en fejl? / Foreslå en forbedring" }).getAttribute("href");
  if (!footer?.includes("github.com/birch-dev501/indberettet/issues/new/choose")) fail(`footer-fejl linker til ${footer}`);
}

async function main() {
  mkdirSync(evidence, { recursive: true });
  await build();
  if (!statSync(join(outDir, "index.html")).isFile()) throw new Error("build skrev ikke out/index.html");
  const server = await serve();
  const browser = await chromium.launch();
  try {
    await doctor();
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport });
      await checkSearch(page, viewport.width);
      await checkSearchPage(page, viewport.width);
      await checkReactions(page, viewport.width);
      await checkFines(page, viewport.width);
      await checkCalculator(page, viewport.width);
      await checkSticky(page, viewport.width);
      await checkLayout(page, viewport.width);
      if (viewport.width === 1280) {
        await checkPwa(page);
        await checkReport(page);
      }
      await page.close();
    }
    const narrow = await browser.newPage({ viewport: { width: 360, height: 740 } });
    await checkLayout(narrow, 360);
    await narrow.close();
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
  if (failures.length) {
    console.error(`${failures.length} fejl`);
    process.exit(1);
  }
  console.log(`Indberettet bestod. Beviser ligger i .verify/evidence`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
