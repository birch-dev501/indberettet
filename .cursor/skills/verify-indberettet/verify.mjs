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
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      try {
        response.end(readFileSync(join(outDir, "404.html")));
      } catch {
        response.end("not found");
      }
      return;
    }
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
      try {
        const missing = readFileSync(join(outDir, "404.html"));
        response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        response.end(missing);
      } catch {
        response.writeHead(404);
        response.end("not found");
      }
    }
  });
  return new Promise((ready, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => ready(server));
  });
}

function run(command, args, env = process.env) {
  return new Promise((ready, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? ready() : reject(new Error(`${command} stopped ${code}`))));
  });
}

async function cleanPythonPath() {
  const venv = join(root, ".verify", "py");
  await run("python3", ["-m", "venv", "--clear", venv]);
  await run(join(venv, "bin", "pip"), ["install", "-r", "requirements.txt"]);
  for (const file of [".github/workflows/pages.yml", ".github/workflows/monthly-update.yml"]) {
    const text = readFileSync(join(root, file), "utf8");
    if (!text.includes("pip install -r requirements.txt") || !text.includes("fonts-dejavu-core")) {
      throw new Error(`${file} installerer ikke requirements.txt og fonts-dejavu-core`);
    }
  }
  return `${join(venv, "bin")}:${process.env.PATH ?? ""}`;
}

function build(pathEnv) {
  return run("npm", ["run", "build"], { ...process.env, PATH: pathEnv, NEXT_PUBLIC_BASE_PATH: "/indberettet" });
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
  const panel = box.locator(".result-groups");
  await panel.waitFor({ timeout: 8000 });
  const covered = await panel.evaluate((node) => {
    const rows = [...node.querySelectorAll(".result-list")].map((list) => {
      const row = list.querySelector("a, .plain") ?? list;
      const rect = row.getBoundingClientRect();
      const heading = list.closest(".result-group")?.querySelector("h3")?.textContent ?? "";
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, heading: heading.replace(/\s+/g, " ").trim() };
    });
    const hits = [];
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const a = rows[i];
        const b = rows[j];
        const overlaps = a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
        if (overlaps) hits.push(`${a.heading} dækker ${b.heading}`);
      }
    }
    return hits;
  });
  if (covered.length > 0) fail(`header-søgning dækker grupper: ${covered.join("; ")}`);
  return (await panel.innerText()).replace(/\s+/g, " ");
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
  await search(page, "pamol");
  const pamolTarget = await page.locator("search[data-search=header] .result-list a").first().getAttribute("href");
  if (!pamolTarget?.includes("/stof/paracetamolum")) fail(`${width} pamol peger på ${pamolTarget}`);
  const pamolText = await page.locator("search[data-search=header] .result-groups").innerText();
  if (pamolText.toLowerCase().includes("bupropion")) fail(`${width} pamol viser bupropion`);
  const testen = await search(page, "testen");
  if (!testen.includes("Sådan læses en test")) fail(`${width} testen finder ikke testsiden`);
  const falsk = await search(page, "falsk positiv");
  if (!falsk.includes("Sådan læses en test")) fail(`${width} falsk positiv finder ikke testsiden`);
  if (width === 1280) {
    await page.locator("search[data-search=page] input[role=searchbox]").fill("pamol");
    await page.locator("search[data-search=page] .result-groups").waitFor();
    const pageTarget = await page.locator("search[data-search=page] .result-list a").first().getAttribute("href");
    if (!pageTarget?.includes("/stof/paracetamolum")) fail(`forside pamol peger på ${pageTarget}`);
    await page.goto(`${base}/soeg/?q=pamol`, { waitUntil: "networkidle" });
    const fullTarget = await page.locator(".result-list a").first().getAttribute("href");
    if (!fullTarget?.includes("/stof/paracetamolum")) fail(`/soeg/ pamol peger på ${fullTarget}`);
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
  }
  await page.screenshot({ path: join(evidence, `soegning-${width}.png`) });
}

async function checkSearchDismiss(page, width) {
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  for (const selector of ["search[data-search=header]", "search[data-search=page]"]) {
    const box = page.locator(selector);
    const input = box.locator("input[role=searchbox]");
    await input.fill("vioxx");
    await box.locator(".result-groups").waitFor();
    const clear = box.getByRole("button", { name: "Ryd søgning" });
    if ((await clear.count()) !== 1) fail(`${width} ${selector} mangler ryd-kryds`);
    await page.mouse.click(2, 320);
    await box.locator(".result-groups").waitFor({ state: "detached", timeout: 3000 }).catch(() => {
      fail(`${width} ${selector} lukker ikke ved klik udenfor`);
    });
    if ((await input.inputValue()) !== "vioxx") fail(`${width} ${selector} slettede teksten ved klik udenfor`);
    const live = await page.locator("[aria-live=polite]").allInnerTexts();
    if (!live.some((text) => text.includes("Listen er lukket"))) fail(`${width} ${selector} meldte ikke at listen lukkede`);
    await input.focus();
    await box.locator(".result-groups").waitFor();
    await input.press("Escape");
    await box.locator(".result-groups").waitFor({ state: "detached", timeout: 3000 }).catch(() => {
      fail(`${width} ${selector} lukker ikke ved Esc`);
    });
    await input.press("Escape");
    if ((await input.inputValue()) !== "") fail(`${width} ${selector} andet Esc ryddede ikke feltet`);
    if ((await clear.count()) !== 0) fail(`${width} ${selector} viser kryds uden tekst`);
    await input.fill("zzzzqqqq");
    await box.locator(".empty-search").waitFor();
    await input.press("Escape");
    await box.locator(".empty-search").waitFor({ state: "detached", timeout: 3000 }).catch(() => {
      fail(`${width} ${selector} lukker ikke tomme træf ved Esc`);
    });
    if ((await input.inputValue()) !== "zzzzqqqq") fail(`${width} ${selector} ryddede den tomme søgning ved første Esc`);
  }
  if (width === 1280) {
    const header = page.locator("search[data-search=header]");
    const headerInput = header.locator("input[role=searchbox]");
    await headerInput.fill("vioxx");
    await header.locator(".result-groups").waitFor();
    await header.getByRole("button", { name: "Ryd søgning" }).focus();
    await page.keyboard.press("Escape");
    await header.locator(".result-groups").waitFor({ state: "detached", timeout: 3000 }).catch(() => {
      fail("Esc på ryd-krydset lukker ikke listen");
    });
    if ((await headerInput.inputValue()) !== "vioxx") fail("Esc på ryd-krydset ryddede teksten");
    await headerInput.fill("vioxx");
    await header.locator(".result-groups").waitFor();
    await page.locator("a.brand").click();
    await header.locator(".result-groups").waitFor({ state: "detached", timeout: 3000 }).catch(() => {
      fail("klik på navnet lukker ikke listen");
    });
    if (!page.url().endsWith("/indberettet/")) fail(`klik på navnet forlod forsiden: ${page.url()}`);
    await headerInput.fill("vioxx");
    await header.locator(".result-groups").waitFor();
    await page.locator("a.skip").click({ force: true });
    await header.locator(".result-groups").waitFor({ state: "detached", timeout: 3000 }).catch(() => {
      fail("spring-til-indhold lukker ikke listen");
    });
    await headerInput.fill("vioxx");
    await header.locator(".result-groups").waitFor();
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return;
      main.setAttribute("tabindex", "-1");
      main.focus();
    });
    await page.keyboard.press("Escape");
    await header.locator(".result-groups").waitFor({ state: "detached", timeout: 3000 }).catch(() => {
      fail("Esc uden for søgefeltet lukker ikke listen");
    });
    if ((await headerInput.inputValue()) !== "vioxx") fail("Esc uden for søgefeltet ryddede teksten");
    const rule = spawn("node", ["--experimental-strip-types", "--test", "lib/search-dismiss.test.ts"], { cwd: root, stdio: "inherit" });
    const ruleCode = await new Promise((done) => rule.on("exit", done));
    if (ruleCode !== 0) fail("reglen for at lukke søgningen fejlede");
  }
}

async function checkSearchPage(page, width) {
  await page.goto(`${base}/soeg/?q=Pfizer`, { waitUntil: "networkidle" });
  const chips = page.getByRole("tablist", { name: "Afgræns typen" });
  await chips.waitFor();
  if (!(await chips.innerText()).includes("Bødesager")) fail(`${width} /soeg/ mangler filteret Bødesager`);
  await page.getByRole("button", { name: /Bødesager/ }).click();
  const text = (await page.locator(".result-groups").innerText()).replace(/\s+/g, " ");
  if (!text.includes("Bextra")) fail(`${width} /soeg/ Bødesager viser ikke Bextra`);
  if (/stoffer\s+\d/i.test(text)) fail(`${width} /soeg/ filteret gemmer ikke de andre grupper`);
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
  const paths = ["/", "/stof/covid-19-vaccines/", "/firma/msd/", "/katalog/", "/forstaa-forskning/", "/forstaa-usikkerhed/", "/forstaa-testen/", "/boedesager/"];
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

async function checkRedirects(page) {
  const routes = [
    ["/stof/oxycodon/", "/stof/oxycodone/"],
    ["/stof/semaglutid/", "/stof/semaglutide/"],
    ["/firma/novo/", "/firma/novo-nordisk/"],
    ["/firma/glaxo/", "/firma/glaxosmithkline/"],
    ["/firma/nova/", "/firma/novartis/"],
  ];
  for (const [from, to] of routes) {
    await page.goto(`${base}${from}`, { waitUntil: "networkidle" });
    if (!page.url().includes(to)) fail(`${from} endte på ${page.url()}`);
  }
  const response = await page.goto(`${base}/stof/findes-ikke-xyz/`, { waitUntil: "networkidle" });
  if (response?.status() !== 404) fail(`ukendt adresse svarer ${response?.status()}`);
  if (!(await page.locator("h1").innerText()).includes("findes ikke")) fail("404 mangler overskrift");
  await page.locator("input[role=searchbox]").first().waitFor();
  await page.getByText("findes ikke xyz").first().waitFor();
  const broken = await page.goto(`${base}/stof/%25ZZ/`, { waitUntil: "networkidle" });
  if (broken?.status() !== 404) fail(`procent-adresse svarer ${broken?.status()}`);
  const raw = await fetch(`${origin}/indberettet/stof/%ZZ/`);
  if (raw.status !== 404) fail(`rå procent-adresse svarer ${raw.status}`);
  if (!(await raw.text()).includes("findes ikke")) fail("rå procent-adresse viser ikke 404-siden");
  if ((await page.locator("body").innerText()).includes("Application error")) fail("procent-adresse viser en programfejl");
  if (!(await page.locator("h1").innerText()).includes("findes ikke")) fail("procent-adresse mangler 404-overskrift");
  await page.goto(`${base}/stof/wegovy/`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Se alle forslag/ }).click();
  await page.waitForURL(/\/soeg\/\?q=wegovy/);
}

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function checkShare(page) {
  const paths = ["/", "/stof/semaglutide/", "/firma/msd/"];
  for (const path of paths) {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    const card = await page.locator('meta[name="twitter:card"]').getAttribute("content");
    if (!image?.startsWith("https://birch-dev501.github.io/indberettet/og/")) fail(`${path} og:image er ${image}`);
    if (card !== "summary_large_image") fail(`${path} twitter:card er ${card}`);
    const local = image.replace("https://birch-dev501.github.io", origin);
    const response = await page.request.get(local);
    const size = pngSize(await response.body());
    if (response.status() !== 200 || size?.width !== 1200 || size?.height !== 630) {
      fail(`${path} billede ${response.status()} ${size?.width}x${size?.height}`);
    }
  }
}

async function checkSitemap(page) {
  const robots = await (await page.request.get(`${base}/robots.txt`)).text();
  if (!robots.includes("https://birch-dev501.github.io/indberettet/sitemap.xml")) fail("robots.txt peger ikke på sitemap");
  const xml = await (await page.request.get(`${base}/sitemap.xml`)).text();
  if (!xml.includes("<urlset")) fail("sitemap er ikke et urlset");
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  if (urls.length < 1000) fail(`sitemap har kun ${urls.length} adresser`);
  const sample = urls.filter((_, index) => index % Math.ceil(urls.length / 50) === 0).slice(0, 50);
  for (const url of sample) {
    const local = url.replace("https://birch-dev501.github.io", origin);
    const response = await page.request.get(local);
    if (response.status() !== 200) fail(`sitemap ${url} svarer ${response.status()}`);
  }
}

async function checkDataDate(page) {
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const stamp = await page.locator("time").first().getAttribute("dateTime");
  if (!stamp || !/^\d{4}-\d{2}-\d{2}$/.test(stamp)) fail(`data-dato er ${stamp}`);
}

function python(code) {
  return new Promise((ready) => {
    const child = spawn("python3", ["-c", code], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      out += chunk;
    });
    child.on("exit", (code) => ready({ code, out }));
  });
}

async function checkLearningNav(page, width) {
  const pages = [
    ["/forstaa-forskning/", "/forstaa-forskning/", "Forsøgstal"],
    ["/forstaa-usikkerhed/", "/forstaa-usikkerhed/", "Usikkerhed"],
    ["/forstaa-testen/", "/forstaa-testen/", "En test"],
  ];
  for (const [path, hrefPart, label] of pages) {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    if (width <= 390) await page.getByRole("button", { name: "Menu" }).click();
    const nav = page.getByRole("navigation", { name: "Hovedmenu" });
    const current = nav.locator("[aria-current=page]");
    if ((await current.count()) !== 1) fail(`${width} ${path} har ${(await current.count())} aktuelle menupunkter`);
    const href = await current.getAttribute("href");
    const text = (await current.innerText()).replace(/\s+/g, " ").trim();
    if (!href?.includes(hrefPart)) fail(`${width} ${path} siger at ${href} er den åbne side`);
    if (text !== label) fail(`${width} ${path} kalder den åbne side ${text}`);
    for (const item of ["Usikkerhed", "En test"]) {
      if ((await nav.getByRole("link", { name: item, exact: true }).count()) !== 1) fail(`${width} menuen mangler ${item}`);
    }
  }
}

async function checkUncertainty(page) {
  await page.goto(`${base}/forstaa-forskning/`, { waitUntil: "networkidle" });
  const fromTrial = page.locator("a[href*='/forstaa-usikkerhed']");
  if ((await fromTrial.count()) < 1) fail("forsøgssiden linker ikke til usikkerhed");
  await page.goto(`${base}/forstaa-usikkerhed/`, { waitUntil: "networkidle" });
  if ((await page.locator("h1").innerText()) !== "Sådan læses usikkerhed.") fail("usikkerhedssiden mangler overskrift");
  const text = await page.locator("main").innerText();
  for (const part of ["18.198", "18.325", "95,0", "90,3", "97,6", "3,70", "7,39", "0,22", "0,90", "2,00", "2,30", "6,68"]) {
    if (!text.includes(part)) fail(`usikkerhedssiden mangler tallet ${part}`);
  }
  if (!text.includes("nulhypotesen er 0") && !text.includes("nulhypotesen 0")) fail("siden siger ikke at forskellens nul er 0");
  if (!text.includes("Nulhypotesen er 1")) fail("siden siger ikke at forholdets nul er 1");
  if (!text.toLowerCase().includes("beviser ikke")) fail("siden siger ikke at ikke-signifikant ikke er et bevis");
  if (!text.toLowerCase().includes("udenlandsk")) fail("usikkerhedssiden mærker ikke Polack som udenlandsk");
  if (!text.includes("0,044") || !text.includes("0,884")) fail("andelene er ikke vist med tre decimaler");
  const source = await page.locator("a[href*='nejm.org']").count();
  if (source < 1) fail("usikkerhedssiden mangler kilden til Polack");
}

async function checkBayes(page) {
  await page.goto(`${base}/forstaa-usikkerhed/`, { waitUntil: "networkidle" });
  if ((await page.locator("a[href*='/forstaa-testen']").count()) < 1) fail("usikkerhedssiden linker ikke til testen");
  await page.goto(`${base}/forstaa-testen/`, { waitUntil: "networkidle" });
  const text = await page.locator("main").innerText();
  if (!(await page.locator("h1").innerText()).includes("Sådan læses en test")) fail("testsiden mangler overskrift");
  if (!text.includes("10.000")) fail("testsiden viser ikke 10.000");
  if (!text.includes("Cochrane")) fail("testsiden mangler kilden");
  if (!text.includes("54,7") || !text.includes("99,7") || !text.includes("73,0") || !text.includes("99,1")) {
    fail("testsiden mangler de offentliggjorte testtal");
  }
  const proof = spawn("node", ["--experimental-strip-types", "--test", "lib/bayes.test.ts"], { cwd: root });
  const code = await new Promise((done) => proof.on("exit", done));
  if (code !== 0) fail("bayes-regnestykket gik ikke op");
}

async function checkExtractGuard() {
  const good = spawn("python3", ["scripts/validate_extract.py"], { cwd: root });
  const goodCode = await new Promise((done) => good.on("exit", done));
  if (goodCode !== 0) fail("validering af det nuværende udtræk fejlede");
  const bad = spawn("python3", ["scripts/validate_extract.py", "--simulate-drop"], { cwd: root });
  const badCode = await new Promise((done) => bad.on("exit", done));
  if (badCode === 0) fail("simuleret afvigelse blev godkendt");
  const hole = await python(`
import importlib.util
spec = importlib.util.spec_from_file_location("guard", "scripts/validate_extract.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
missing = mod.compare({"covid-19-vaccines": 45537}, {})
drop = mod.compare({"semaglutide": 3329}, {"semaglutide": 2662})
small = mod.compare({"aclidinium": 49}, {"aclidinium": 1})
assert missing and "mangler" in missing, missing
assert drop and "faldt" in drop, drop
assert small is None, small
print("ok")
`);
  if (hole.code !== 0) fail(`udtrækstjekket godkendte et hul: ${hole.out.trim()}`);
  const pictures = await python(`
import importlib.util, hashlib
from pathlib import Path
spec = importlib.util.spec_from_file_location("og", "scripts/build_og_images.py")
og = importlib.util.module_from_spec(spec)
spec.loader.exec_module(og)
out = Path(".verify/og-probe")
names = [
 "Respiratory Syncytial Virus, Subgroup A, Stabilized Prefusion F Protein 847a",
 "Respiratory Syncytial Virus, Subgroup B, Stabilized Prefusion F Protein 847b",
]
paths = []
for name in names:
 dest = out / f"{name[-4:]}.png"
 og.card(name, ["118 indberetninger", "19 alvorlige · 0 ved dødsfald"], dest)
 paths.append(dest)
assert paths[0].read_bytes() != paths[1].read_bytes()
empty = og.company_lines({"substances": []})
assert not any("0 indberetninger" in line for line in empty), empty
print("ok")
`);
  if (pictures.code !== 0) fail(`delingsbilleder kan ikke skelnes: ${pictures.out.trim()}`);
  const links = JSON.parse(readFileSync(join(root, "data/term-links.json"), "utf8"));
  for (const term of ["Nausea", "Vomiting", "Diarrhoea", "Iron deficiency anaemia", "Hypercholesterolaemia", "Obesity"]) {
    const row = links.terms[term];
    if (row?.url && row.verified) fail(`${term} linker stadig til ${row.url}`);
  }
}

async function main() {
  mkdirSync(evidence, { recursive: true });
  const pathEnv = await cleanPythonPath();
  await build(pathEnv);
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
      await checkSearchDismiss(page, viewport.width);
      await checkSearchPage(page, viewport.width);
      await checkReactions(page, viewport.width);
      await checkFines(page, viewport.width);
      await checkCalculator(page, viewport.width);
      await checkSticky(page, viewport.width);
      await checkLayout(page, viewport.width);
      await checkLearningNav(page, viewport.width);
      if (viewport.width === 1280) {
        await checkPwa(page);
        await checkReport(page);
        await checkRedirects(page);
        await checkShare(page);
        await checkSitemap(page);
        await checkDataDate(page);
        await checkUncertainty(page);
        await checkBayes(page);
        await checkExtractGuard();
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
