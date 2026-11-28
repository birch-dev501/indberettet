import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { articleHeadings, articleLinks, parseArticle } from "./article-markdown.ts";

const slug = "luftvejsinfektioner-uden-vaccine";
const markdown = readFileSync(`content/${slug}.md`, "utf8");
const page = readFileSync(`app/${slug}/page.tsx`, "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const footer = readFileSync("components/site-footer.tsx", "utf8");
const sitemap = readFileSync("app/sitemap.ts", "utf8");
const search = readFileSync("lib/search.ts", "utf8");

const headings = [
  "Kan man forebygge vinterens luftvejsinfektioner uden vaccine?",
  "D-vitamin",
  "Saltvand og sprays i næse og svælg",
  "Det skal du være opmærksom på",
  "Hvad med vaccinen?",
  "Bundlinjen",
];

// Hver kilde og de tal, siden henter fra den.
const sources: { link: string; numbers: string[] }[] = [
  { link: "https://doi.org/10.1136/bmj.i6583", numbers: ["25 forsøg", "11.321"] },
  { link: "https://doi.org/10.1016/S2213-8587(24)00348-6", numbers: ["40 forsøg", "61.589", "0,94", "0,88", "1,00", "den forrige opdatering"] },
  { link: "https://doi.org/10.1093/cid/ciad770", numbers: ["VITAL"] },
  { link: "https://doi.org/10.1016/S2213-8587(20)30380-6", numbers: ["D-Health"] },
  { link: "https://doi.org/10.1001/jama.2010.594", numbers: ["2.256", "500.000", "15 %", "26 %", "lige på grænsen"] },
  { link: "https://www.sst.dk/vidensbase/forebyggelse/ernaering-mad-og-maaltider/tilskud-af-d-vitamin-og-calcium", numbers: ["5 til 10 mikrogram", "20 mikrogram", "100 mikrogram"] },
  { link: "https://x.com/MidwesternDoc/status/2126633702696288594", numbers: [] },
  { link: "https://doi.org/10.1016/S2213-2600(24)00140-1", numbers: ["13.799", "6,4", "8,2", "uden spray", "selvrapporterede", "efter mulig smitte", "ikke flere bivirkninger", "færre antibiotikakure"] },
  { link: "https://doi.org/10.3399/BJGP.2025.0269", numbers: ["17,7", "21,8", "12 måneder"] },
  { link: "https://doi.org/10.1038/s41598-018-37703-3", numbers: ["68 voksne", "1,9 dag", "2,6 %", "åbent pilotforsøg"] },
  { link: "https://doi.org/10.7189/jogh.14.05027", numbers: ["576", "hanevand"] },
  { link: "https://doi.org/10.1016/j.amepre.2005.06.013", numbers: ["387", "ingen sikker effekt"] },
  { link: "https://doi.org/10.4178/epih.e2021051", numbers: ["1 %", "0,5 %"] },
  { link: "https://doi.org/10.21873/invivo.13313", numbers: ["1.252", "ingen placebo"] },
  { link: "https://www.sundhed.dk/borger/patienthaandbogen/oere-naese-hals/sygdomme/bihulerne/bihulebetaendelse-akut/", numbers: ["0,9 %", "tilstoppet næse"] },
  { link: "https://doi.org/10.1093/cid/cis626", numbers: [] },
  { link: "https://doi.org/10.1177/0145561320932318", numbers: ["skjoldbruskkirtlen", "radioaktiv jodbehandling"] },
  { link: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=58b25d79-78f2-4953-b0c6-61658dc4ef0d", numbers: [] },
  { link: "https://www.sst.dk/vaccination", numbers: ["20. december 2026", "gravide i 2. og 3. trimester"] },
];

test("luftvejssiden har titel, overskrifter, kilder og forbehold", () => {
  assert.deepEqual(articleHeadings(markdown), headings);
  const found = articleLinks(markdown);
  for (const { link, numbers } of sources) {
    assert.equal(found.includes(link), true, link);
    for (const number of numbers) assert.equal(markdown.includes(number), true, number);
  }
  assert.equal(new Set(found).size, sources.length);
  assert.equal(markdown.split("ikke lægelig rådgivning").length - 1, 2);
  assert.equal(markdown.includes("](/influenzavaccine-raske/)"), true);
  assert.equal(page.includes('from "@/components/article-blocks"'), true);
  assert.equal(page.includes("Alternativer til medicin. Om forebyggelse."), true);
  const blocks = parseArticle(markdown);
  assert.equal(blocks[0]?.type, "h1");
  assert.equal(blocks.some((block) => block.type === "ul"), true);
});

test("luftvejssiden fraråder ikke vaccination og har ingen tabeller", () => {
  assert.equal(markdown.includes("influenza og covid-19"), true);
  assert.equal(markdown.includes("Saltvand er ikke et alternativ til vaccinen"), true);
  assert.equal(markdown.includes("Det erstatter ikke vaccinen"), true);
  assert.equal(markdown.includes("er du gravid"), true);
  assert.equal(markdown.includes("anbefaler vaccination"), true);
  assert.equal(markdown.includes("65 år og derover"), true);
  assert.equal(markdown.includes("Vaccinen vurderes på bekræftet influenza og på risikoen for et alvorligt forløb."), true);
  assert.equal(markdown.includes("ammer"), false);
  for (const phrase of ["spring vaccinen over", "fravælg vaccinen", "stop din medicin", "i stedet for vaccine"]) {
    assert.equal(markdown.toLowerCase().includes(phrase), false, phrase);
  }
  assert.equal(markdown.split("\n").some((line) => line.trim().startsWith("|")), false);
});

test("luftvejssiden er linket fra forsiden, sidefoden, sitemap og søgning", () => {
  assert.equal(home.includes(`href="/${slug}/"`), true);
  assert.equal(footer.includes(`href="/${slug}"`), true);
  assert.equal(sitemap.includes(`"/${slug}/"`), true);
  assert.equal(search.includes(`href: "/${slug}"`), true);
});

test("forbeholdet får note-klassen, og linket til influenzasiden har basePath", (t) => {
  const htmlPath = `out/${slug}/index.html`;
  if (!existsSync(htmlPath)) {
    t.skip(`${htmlPath} findes ikke. Kør npm run build først.`);
    return;
  }
  const html = readFileSync(htmlPath, "utf8");
  const notes = [...html.matchAll(/<p class="note">([\s\S]*?)<\/p>/g)].map((match) => match[1]);
  assert.equal(notes.length, 2);
  for (const note of notes) assert.equal(note.includes("ikke lægelig rådgivning"), true, note);
  assert.equal(html.includes('href="/indberettet/influenzavaccine-raske/"'), true);
  assert.equal(html.includes('href="/influenzavaccine-raske/"'), false);
});
