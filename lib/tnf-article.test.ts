import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { isSitePath, sitePathHref } from "./article-href.ts";
import { articleHeadings, articleLinks, parseArticle, parseInline } from "./article-markdown.ts";

const markdown = readFileSync("content/tnf-haemmere-bakteriaemi.md", "utf8");
const page = readFileSync("app/tnf-haemmere-bakteriaemi/page.tsx", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const footer = readFileSync("components/site-footer.tsx", "utf8");
const sitemap = readFileSync("app/sitemap.ts", "utf8");
const search = readFileSync("lib/search.ts", "utf8");

const links = [
  "https://doi.org/10.1111/apt.70999",
  "https://www.dagensmedicin.dk/nyheder/gastroenterologi-hepatologi/ibd-patienter-i-behandling-med-tnf-haemmere-far-oftere-bakteriaemi-dm/",
  "https://www.meldenbivirkning.dk",
];

const headings = [
  "TNF-hæmmere og bakterier i blodet ved tarmsygdom: Hvad viser det danske studie?",
  "Hvad har studiet undersøgt?",
  "Hvad betyder 73 % højere?",
  "Hvilke lægemidler handler det om?",
  "Hvad ved vi ikke?",
  "Hvad betyder det for patienter?",
  "Bundlinjen",
];

test("tnf-siden har titel, overskrifter, links og forbehold", () => {
  assert.equal(articleHeadings(markdown)[0], headings[0]);
  assert.deepEqual(articleHeadings(markdown), headings);
  const found = articleLinks(markdown);
  for (const link of links) assert.equal(found.includes(link), true, link);
  assert.equal(new Set(found).size, links.length);
  assert.equal(markdown.split("ikke lægelig rådgivning").length - 1, 2);
  assert.equal(page.includes('className={disclaimer ? "note"'), true);
  assert.equal(markdown.includes("4.503"), true);
  assert.equal(markdown.includes("22.473"), true);
  assert.equal(markdown.includes("1,73"), true);
  assert.equal(markdown.includes("1,49 til 2,00"), true);
  assert.equal(markdown.includes("73 % højere"), true);
  assert.equal(markdown.includes("258 (5,7 %)"), true);
  assert.equal(markdown.includes("3,6 %"), true);
  assert.equal(markdown.includes("1,34 til 2,23"), true);
  assert.equal(markdown.includes("1,24 til 1,93"), true);
  assert.equal(markdown.includes("1,88"), true);
  assert.equal(markdown.includes("2,20"), true);
  assert.equal(markdown.includes("2,25"), true);
  assert.equal(markdown.includes("3,15"), true);
  assert.equal(markdown.includes("1,59"), true);
  assert.equal(markdown.includes("0,85"), true);
  assert.equal(markdown.includes("0,68"), true);
  assert.equal(markdown.includes("ikke statistisk sikker"), true);
  assert.equal(markdown.includes("tolkes forsigtigt"), true);
  assert.equal(markdown.includes("rapporterer ikke, hvor mange tilfælde der typisk sker pr. 1.000"), true);
  assert.equal(markdown.includes("ikke et lodtrækningsforsøg"), true);
  assert.equal(markdown.includes("Stop ikke din medicin uden at tale med en læge"), true);
  assert.equal(markdown.includes("meldenbivirkning.dk"), true);
  assert.equal(markdown.includes("](/forstaa-forskning)"), true);
  for (const slug of ["infliximab", "adalimumab", "golimumab", "certolizumab", "etanercept", "vedolizumab", "ustekinumab"]) {
    assert.equal(markdown.includes(`](/stof/${slug})`), true, slug);
  }
  assert.equal(markdown.includes("Cæcilie Leding"), true);
  assert.equal(markdown.includes("advare mod behandlingerne"), true);
  assert.equal(markdown.includes("Hvidovre"), false);
  assert.equal(markdown.includes("svigerfar"), false);
  const blocks = parseArticle(markdown);
  assert.equal(blocks[0]?.type, "h1");
});

test("siden er linket fra forsiden, sidfoden, sitemap og søgning", () => {
  assert.equal(home.includes('href="/tnf-haemmere-bakteriaemi/"'), true);
  assert.equal(footer.includes('href="/tnf-haemmere-bakteriaemi"'), true);
  assert.equal(sitemap.includes('"/tnf-haemmere-bakteriaemi/"'), true);
  assert.equal(search.includes('href: "/tnf-haemmere-bakteriaemi"'), true);
});

test("interne markdown-links renderes med basePath i href", () => {
  assert.equal(page.includes("sitePathHref(part.href)"), true);
  assert.equal(page.includes("isSitePath(part.href)"), true);
  const hrefs = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]);
  const internal = hrefs.filter((href) => isSitePath(href));
  assert.ok(internal.includes("/stof/infliximab"));
  assert.ok(internal.includes("/forstaa-forskning"));
  for (const href of internal) {
    const rendered = sitePathHref(href);
    assert.equal(rendered.startsWith("/indberettet/"), true, href);
    assert.equal(rendered.includes('href="/stof/'), false, href);
    const parts = parseInline(`[x](${href})`);
    const link = parts.find((part) => part.type === "link");
    assert.equal(link?.type === "link" && sitePathHref(link.href), rendered);
  }
});

test("det byggede html har /indberettet på interne links", (t) => {
  const htmlPath = "out/tnf-haemmere-bakteriaemi/index.html";
  if (!existsSync(htmlPath)) {
    t.skip("out/tnf-haemmere-bakteriaemi/index.html findes ikke. Kør npm run build først.");
    return;
  }
  const html = readFileSync(htmlPath, "utf8");
  assert.equal(html.includes('href="/stof/'), false);
  assert.equal(html.includes('href="/forstaa-forskning'), false);
  assert.equal(html.includes('href="/indberettet/stof/infliximab/'), true);
  assert.equal(html.includes('href="/indberettet/forstaa-forskning/'), true);
  assert.equal(html.includes('href="https://www.meldenbivirkning.dk"'), true);
});
