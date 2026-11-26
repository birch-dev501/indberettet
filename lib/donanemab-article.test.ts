import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { articleHeadings, articleLinks, parseArticle } from "./article-markdown.ts";

const markdown = readFileSync("content/donanemab-alzheimer.md", "utf8");
const substack = readFileSync("substack/donanemab-alzheimer.md", "utf8");
const page = readFileSync("app/donanemab-alzheimer/page.tsx", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const footer = readFileSync("components/site-footer.tsx", "utf8");
const sitemap = readFileSync("app/sitemap.ts", "utf8");
const search = readFileSync("lib/search.ts", "utf8");

const links = [
  "https://medicinraadet.dk/nyheder/2026/medicinradet-anbefaler-ikke-donanemab-mod-tidlig-alzheimers-sygdom",
  "https://medicinraadet.dk/igangvaerende-vurderinger/laegemidler-og-indikationsudvidelser/donanemab-kisunla-alzheimers-sygdom",
  "https://doi.org/10.1001/jama.2023.13239",
  "https://www.ema.europa.eu/en/documents/product-information/kisunla-epar-product-information_en.pdf",
  "https://filer.medicinraadet.dk/media/dv4ku34r/medicinradets-vurdering-af-donanemab-til-behandling-af-alzheimers-sygdom-vers-1-0-x.pdf",
  "https://www.ema.europa.eu/en/medicines/human/EPAR/kisunla",
  "https://www.ema.europa.eu/en/documents/medicine-qa/questions-answers-approval-marketing-authorisation-kisunla-donanemab-outcome-re-examination_en.pdf",
  "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=761248",
  "https://laegemiddelstyrelsen.dk/da/bivirkninger/bivirkninger-ved-medicin/interaktive-bivirkningsoversigter/",
  "https://www.meldenbivirkning.dk",
  "https://www.adrreports.eu/",
  "https://medicinraadet.dk/nyheder/2025/medicinradet-anbefaler-ikke-nyt-laegemiddel-til-patienter-med-alzheimers-sygdom",
  "https://filer.medicinraadet.dk/media/5pyntr1x/medicinradets-anbefaling-vedr-donanemab-til-behandling-af-alzheimers-sygdom-vers-1-0.pdf",
];

const headings = [
  "Donanemab (Kisunla) mod tidlig Alzheimers: Lille gevinst, reel risiko, og hvorfor Medicinrådet siger nej",
  "Hvad har Medicinrådet besluttet?",
  "Hvad viser forsøget om effekten?",
  "Hvad viser forsøget om bivirkninger?",
  "Hvorfor betyder generne (ApoE ε4) noget?",
  "Hvad siger EMA og FDA?",
  "Hvad ved vi om bivirkninger i Danmark?",
  "Hvad med lecanemab?",
  "Hvad med prisen?",
  "Hvad betyder det for patienter og pårørende?",
  "Bundlinjen",
];

test("donanemab-siden har titel, overskrifter, links og forbehold", () => {
  assert.equal(articleHeadings(markdown)[0], headings[0]);
  assert.deepEqual(articleHeadings(markdown), headings);
  const found = articleLinks(markdown);
  for (const link of links) assert.equal(found.includes(link), true, link);
  assert.equal(new Set(found).size, links.length);
  assert.equal(markdown.split("ikke lægelig rådgivning").length - 1, 2);
  assert.equal(page.includes('className={disclaimer ? "note"'), true);
  assert.equal(markdown.includes("0,69"), true);
  assert.equal(markdown.includes("5,8 måneder"), true);
  assert.equal(markdown.includes("2,65"), true);
  assert.equal(markdown.includes("2,9 måneder"), true);
  assert.equal(markdown.includes("33,0 %"), true);
  assert.equal(markdown.includes("13,5 %"), true);
  assert.equal(markdown.includes("5,6 %"), true);
  assert.equal(markdown.includes("1,4 %"), true);
  assert.equal(markdown.includes("0,4 %"), true);
  assert.equal(markdown.includes("12,8 %"), true);
  assert.equal(markdown.includes("3,8 %"), true);
  assert.equal(markdown.includes("55,9 %"), true);
  assert.equal(markdown.includes("250.000"), true);
  assert.equal(markdown.includes("0,18"), true);
  assert.equal(markdown.includes("650"), true);
  assert.equal(markdown.includes("710"), true);
  assert.equal(markdown.includes("728"), true);
  const blocks = parseArticle(markdown);
  assert.equal(blocks[0]?.type, "h1");
  assert.equal(blocks.some((block) => block.type === "ul"), true);
});

test("siden er linket fra forsiden, sidfoden, sitemap og søgning", () => {
  assert.equal(home.includes('href="/donanemab-alzheimer/"'), true);
  assert.equal(footer.includes('href="/donanemab-alzheimer"'), true);
  assert.equal(sitemap.includes('"/donanemab-alzheimer/"'), true);
  assert.equal(search.includes('href: "/donanemab-alzheimer"'), true);
});

test("substack-udgaven har samme tekst og linket til siden", () => {
  assert.equal(substack.includes(markdown.trim()), true);
  assert.equal(substack.includes("https://birch-dev501.github.io/indberettet/donanemab-alzheimer/"), true);
});
