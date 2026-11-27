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
  "https://www.kristeligt-dagblad.dk/danmark/nej-til-alzheimermedicin-er-fornuftigt-hvis-man-vil-have-en-ny-bil-saa-kommer-man-nok-ikke",
  "https://www.alzheimer.dk/nyheder/2026/skuffelse-i-alzheimerforeningen-over-nyt-nej-til-ny-medicin-der-udsaetter-forvaerring-af-sygdommen/",
  "https://politiken.dk/danmark/sundhed/art11074486/%C2%BBBanebrydende%C2%AB-medicin-mod-Alzheimers-afvises-i-Danmark",
  "https://www.dagensmedicin.dk/nyheder/neurologi/DMafslag-pa-alzheimermedicin-kom-ikke-bag-pa-professor/",
  "https://www.dr.dk/nyheder/indland/niels-fik-bremset-sin-alzheimers-sygdom-hans-datter-haaber-behandlingen-indfoeres-i-danmark",
];

const headings = [
  "Donanemab (Kisunla) mod tidlig Alzheimers: Hvad viser tallene, og hvorfor anbefaler Medicinrådet det ikke?",
  "Hvad har Medicinrådet besluttet?",
  "Hvad viser forsøget om effekten?",
  "Hvad viser forsøget om bivirkninger?",
  "Hvorfor betyder generne (ApoE ε4) noget?",
  "Hvad siger EMA og FDA?",
  "Hvad ved vi om bivirkninger i Danmark?",
  "Hvad med lecanemab?",
  "Hvad med prisen?",
  "Hvad betyder det for patienter og pårørende?",
  "Debatten efter afgørelsen",
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
  assert.equal(markdown.includes("1,5 point"), true);
  const iadrsNote = markdown.slice(markdown.indexOf("1,5 point") - 80, markdown.indexOf("1,5 point") + 120);
  assert.equal(iadrsNote.includes("2,65"), true);
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
  assert.equal(markdown.includes("det første lægemiddel"), false);
  assert.equal(markdown.includes("et af to lægemidler"), true);
  assert.equal(markdown.includes("iADRS det primære effektmål"), true);
  assert.equal(markdown.includes("CDR-SB et sekundært"), true);
  assert.equal(markdown.includes("22,8 %"), true);
  assert.equal(markdown.includes("34,4 %"), true);
  assert.equal(markdown.includes("CDR-G"), true);
  assert.equal(markdown.includes("n=672 og 701"), true);
  assert.equal(markdown.includes("særlig vægt"), true);
  assert.equal(markdown.includes("har stor betydning for patientens liv"), true);
  assert.equal(markdown.includes("kan have betydning for patienten"), true);
  assert.equal(markdown.includes("Virksomheden fremhæver, at 22,8"), false);
  assert.equal(markdown.includes("ikke anbefaler donanemab som standardbehandling"), true);
  assert.equal(markdown.includes("Debatten efter afgørelsen"), true);
  assert.equal(markdown.includes("tre til seks måneder"), true);
  assert.equal(markdown.includes("2,9 ligger under"), true);
  assert.equal(markdown.includes("I vurderingen er de samme data gjort op"), true);
  assert.equal(markdown.includes("Intervallet på CDR-SB går over seks"), true);
  assert.equal(markdown.includes("intervallet på iADRS under tre"), true);
  assert.equal(markdown.includes("usikkerhedsintervallerne går både"), false);
  assert.equal(markdown.includes("På siden her er de samme data omregnet"), false);
  assert.equal(markdown.includes("Hvis man vil have en ny bil, så kommer man nok ikke på skiferie."), true);
  assert.equal(markdown.includes("Til dem, der er kede af afgørelsen"), true);
  assert.equal(markdown.includes('valget: "Hvis man vil have en ny bil'), false);
  assert.equal(markdown.includes("Det er ikke et tal for donanemab"), true);
  assert.equal(markdown.includes("Jakob Blicher"), true);
  assert.equal(markdown.includes("utrolig meget bedre end ingenting"), true);
  assert.equal(markdown.includes("et af to lægemidler"), true);
  assert.equal(markdown.includes("Torben Moos"), true);
  assert.equal(markdown.includes("500.000"), true);
  assert.equal(markdown.includes("ti behandlinger"), true);
  assert.equal(markdown.includes("familiens beretning"), true);
  assert.equal(markdown.includes("Allerede før afgørelsen"), true);
  assert.equal(markdown.includes("Vestergaard"), false);
  assert.equal(markdown.includes("Kastbjerg"), false);
  assert.equal(markdown.includes("Herning"), false);
  assert.equal(markdown.includes("svigerfar"), false);
  assert.equal(markdown.includes("Hvidovre"), false);
  assert.equal(markdown.includes("skærpet indberetningspligt"), false);
  assert.equal(markdown.includes("supplerende overvågning"), true);
  assert.equal(markdown.includes("2.488"), true);
  assert.equal(markdown.includes("72 uger"), true);
  assert.equal(markdown.includes("blandt dem, som EU-godkendelsen gælder"), true);
  assert.equal(markdown.includes("Ingen sammenligning med placebo efter 18 måneder"), true);
  assert.equal(markdown.includes("13 mod 8 patienter"), true);
  assert.equal(markdown.includes("0,4 % (3 patienter) og 0"), false);
  assert.equal(markdown.includes("forudgående jernaflejring"), true);
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
