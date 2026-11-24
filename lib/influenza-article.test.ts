import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { articleHeadings, articleLinks, parseArticle, parseInline } from "./article-markdown.ts";

const markdown = readFileSync("content/influenzavaccine-raske.md", "utf8");
const substack = readFileSync("substack/influenzavaccine-raske.md", "utf8");
const page = readFileSync("app/influenzavaccine-raske/page.tsx", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const substance = readFileSync("app/stof/[slug]/page.tsx", "utf8");

const links = [
  "https://www.cochrane.org/evidence/CD001269_vaccines-prevent-influenza-healthy-adults",
  "https://www.dr.dk/nyheder/viden/naturvidenskab/4-paastande-om-influenzavaccine-holder-de-stik",
  "https://jamanetwork.com/journals/jama/fullarticle/193139",
  "https://videnskab.dk/krop-sundhed/influenzavaccination-boer-du-faa-den/",
  "https://jamanetwork.com/journals/jama/fullarticle/185509",
  "https://www.nature.com/articles/s41467-018-08036-6",
  "https://doi.org/10.1002/14651858.CD005187.pub6",
  "https://www.medrxiv.org/content/10.1101/2025.01.30.25321421v4",
  "https://www.cdc.gov/mmwr/volumes/74/wr/mm7406a2.htm",
  "https://doi.org/10.1371/journal.pmed.1000258",
  "https://doi.org/10.1371/journal.pone.0086555",
  "https://doi.org/10.1016/S2213-2600(22)00266-1",
  "https://www.sst.dk/vaccination",
  "https://x.com/AlexBerenson/status/2086111571164426511",
  "https://x.com/AlexBerenson/status/1909598105705591170",
];

const headings = [
  "Influenzavaccine til raske: Et nej tak kan være et oplyst valg",
  "Hvad vaccinen gør for raske voksne",
  "Vaccinen beskytter mod influenza, ikke mod vinterens forkølelser",
  "Færre sygedage på arbejdspladsen?",
  "Beskytter du andre ved at blive vaccineret?",
  "Cleveland Clinic-studiet: Flere smittede blandt de vaccinerede?",
  "Bliver man mere syg af vaccinen?",
  "Bivirkninger",
  "Hvem bør overveje den?",
  "Hvad med de skarpeste kritikere?",
  "Bundlinjen",
];

test("influenzasiden har titel, overskrifter, links og forbehold", () => {
  assert.equal(articleHeadings(markdown)[0], headings[0]);
  assert.deepEqual(articleHeadings(markdown), headings);
  const found = articleLinks(markdown);
  for (const link of links) assert.equal(found.includes(link), true, link);
  assert.equal(new Set(found).size, links.length);
  assert.equal(markdown.split("ikke lægelig rådgivning").length - 1, 2);
  assert.equal(page.includes('className={disclaimer ? "note"'), true);
  assert.equal(markdown.includes("23 ud af 1.000"), true);
  assert.equal(markdown.includes("9 ud af 1.000"), true);
  assert.equal(markdown.includes("omkring 71"), true);
  assert.equal(markdown.includes("61 %"), true);
  assert.equal(markdown.includes("Kun lidt"), false);
  assert.equal(markdown.includes("moralsk pligt"), false);
  const blocks = parseArticle(markdown);
  assert.equal(blocks[0]?.type, "h1");
  assert.equal(blocks.some((block) => block.type === "ul"), true);
});

test("siden er linket fra forsiden og fra influenzavacciner", () => {
  assert.equal(home.includes('href="/influenzavaccine-raske/"'), true);
  assert.equal(substance.includes('slug === "influenza-vaccines"'), true);
  assert.equal(substance.includes('href: "/influenzavaccine-raske/"'), true);
});

test("en overskrift uden det kendte format standser ikke læseren", () => {
  const blocks = parseArticle("# Titel\n\n#### Dyb\n\n#tag\n\nAlmindelig tekst.");
  assert.deepEqual(
    blocks.map((block) => (block.type === "p" ? block.text : block.type)),
    ["# Titel", "#### Dyb", "#tag", "Almindelig tekst."],
  );
});

test("et link skal være http eller en sti på siden", () => {
  const blocked = parseInline("[x](javascript:alert(1))");
  assert.equal(blocked.some((part) => part.type === "link"), false);
  assert.equal(blocked.map((part) => (part.type === "text" ? part.text : "")).join(""), "[x](javascript:alert(1))");
  const allowed = parseInline("[a](https://example.com/a) og [b](/lokal)");
  assert.deepEqual(
    allowed.flatMap((part) => (part.type === "link" ? [part.href] : [])),
    ["https://example.com/a", "/lokal"],
  );
});

test("substack-udgaven har samme tekst og linket til siden", () => {
  assert.equal(substack.includes(markdown.trim()), true);
  assert.equal(substack.includes("https://birch-dev501.github.io/indberettet/influenzavaccine-raske/"), true);
});
