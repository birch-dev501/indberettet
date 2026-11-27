import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { articleHeadings, articleLinks, parseArticle } from "./article-markdown.ts";

const markdown = readFileSync("content/minoxidil-kaeledyr.md", "utf8");
const page = readFileSync("app/minoxidil-kaeledyr/page.tsx", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const footer = readFileSync("components/site-footer.tsx", "utf8");
const sitemap = readFileSync("app/sitemap.ts", "utf8");
const search = readFileSync("lib/search.ts", "utf8");
const substance = readFileSync("app/stof/[slug]/page.tsx", "utf8");

const links = [
  "https://laegemiddelstyrelsen.dk/da/nyheder/2026/receptfrie-laegemidler-mod-haartab-hos-mennesker-kan-give-en-raekke-alvorlige-bivirkninger/",
  "https://www.dr.dk/nyheder/seneste/styrelse-advarer-dyreejere-om-haartabsmiddel",
  "https://doi.org/10.5326/JAAHA-MS-7154",
  "https://www.aemps.gob.es/informa/la-aemps-alerta-del-riesgo-de-que-los-animales-de-compania-entren-en-contacto-con-medicamentos-topicos-de-uso-humano-que-contengan-minoxidil/",
  "https://laegemiddelstyrelsen.dk/da/bivirkninger/bivirkninger-ved-medicin-til-dyr/meld-en-bivirkning-eller-manglende-effekt-i-dyr/",
];

const headings = [
  "Minoxidil mod hårtab kan gøre katte og hunde alvorligt syge",
  "Hvad er der sket?",
  "Hvilke tegn skal du være opmærksom på?",
  "Hvad kan du gøre, hvis du bruger minoxidil?",
  "Hvad ved vi ikke?",
  "Hvordan indberetter du en mistanke?",
  "Bundlinjen",
];

test("minoxidil-siden har titel, overskrifter, links og forbehold", () => {
  assert.equal(articleHeadings(markdown)[0], headings[0]);
  assert.deepEqual(articleHeadings(markdown), headings);
  const found = articleLinks(markdown);
  for (const link of links) assert.equal(found.includes(link), true, link);
  assert.equal(new Set(found).size, links.length);
  assert.equal(markdown.split("ikke lægelig eller dyrlægefaglig rådgivning").length - 1, 2);
  assert.equal(page.includes('className={disclaimer ? "note"'), true);
  assert.equal(page.includes("Advarsel. Om kæledyr."), true);
  const kort = markdown.slice(0, markdown.indexOf("### "));
  assert.equal(kort.includes("Denne side handler om kæledyr, ikke om bivirkninger hos den, der bruger midlet."), true);
  assert.equal(markdown.includes("211"), true);
  assert.equal(markdown.includes("62 katte"), true);
  assert.equal(markdown.includes("12,9 procent"), true);
  assert.equal(markdown.includes("2001 til 2019"), true);
  assert.equal(markdown.includes("De siger ikke, hvor ofte det sker i Danmark"), true);
  assert.equal(markdown.includes("mindst 8 tilfælde"), true);
  assert.equal(markdown.includes("4 i Spanien, 3 i Belgien og 1 i USA"), true);
  assert.equal(markdown.includes("3 katte og 5 hunde"), true);
  assert.equal(markdown.includes("Ifølge Lægemiddelstyrelsen skal den europæiske bivirkningskomité PRAC i det nye år vurdere, om bivirkningerne hos katte og hunde skal stå i produktinformationen."), true);
  assert.equal(markdown.split("PRAC").length - 1, 1);
  assert.equal(markdown.includes("PRAC skal i 2027"), false);
  assert.equal(markdown.includes("PRAC har endnu ikke vurderet"), false);
  assert.equal(markdown.includes("2027"), false);
  assert.equal(markdown.includes("begrænset viden"), true);
  assert.equal(markdown.includes("ikke danske tal"), true);
  assert.equal(markdown.includes("](/stof/minoxidil/)"), true);
  assert.equal(markdown.includes("REGAINE"), false);
  assert.equal(markdown.includes("LONITEN"), false);
  assert.equal(markdown.includes("modgift"), false);
  const blocks = parseArticle(markdown);
  assert.equal(blocks[0]?.type, "h1");
  assert.equal(blocks.some((block) => block.type === "ul"), true);
});

test("siden er linket fra forsiden, sidfoden, sitemap, søgning og stofoversigten", () => {
  assert.equal(home.includes('href="/minoxidil-kaeledyr/"'), true);
  assert.equal(footer.includes('href="/minoxidil-kaeledyr"'), true);
  assert.equal(sitemap.includes('"/minoxidil-kaeledyr/"'), true);
  assert.equal(search.includes('href: "/minoxidil-kaeledyr"'), true);
  assert.equal(substance.includes('slug === "minoxidil"'), true);
  assert.equal(substance.includes('href: "/minoxidil-kaeledyr/"'), true);
});
