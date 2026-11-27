import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { articleHeadings, articleLinks, parseArticle } from "./article-markdown.ts";

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
