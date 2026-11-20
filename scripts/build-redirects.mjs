import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chooseShortTarget } from "./company-alias.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = "/indberettet";
const index = JSON.parse(readFileSync(path.join(root, "data/index.json"), "utf8"));
const companies = JSON.parse(readFileSync(path.join(root, "data/companies.json"), "utf8"));
const substanceSlugs = new Set(index.substances.map((item) => item.slug));
const companySlugs = new Set(companies.companies.map((item) => item.slug));

function page(target) {
  const href = `${base}${target}`;
  return `<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="utf-8">
<link rel="canonical" href="${href}">
<meta http-equiv="refresh" content="0;url=${href}">
<title>Viderestiller</title>
<script>location.replace(${JSON.stringify(href)})</script>
</head>
<body><p><a href="${href}">Videre til siden</a></p></body>
</html>
`;
}

function writeAlias(kind, alias, target) {
  const dir = path.join(root, "public", kind, alias);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "index.html"), page(target));
}

const used = new Set();
for (const slug of substanceSlugs) {
  if (!slug.endsWith("e") || slug.length < 6) continue;
  const alias = slug.slice(0, -1);
  if (substanceSlugs.has(alias) || used.has(`stof/${alias}`)) continue;
  used.add(`stof/${alias}`);
  writeAlias("stof", alias, `/stof/${slug}/`);
}
const seenShort = new Set();
for (const company of companies.companies) {
  const short = company.slug.split("-")[0];
  if (!short || short.length < 3 || seenShort.has(short) || companySlugs.has(short)) continue;
  seenShort.add(short);
  const target = chooseShortTarget(companies.companies, short);
  if (!target || used.has(`firma/${short}`)) continue;
  used.add(`firma/${short}`);
  writeAlias("firma", short, `/firma/${target}/`);
}
console.log(`Viderestillinger: ${used.size}`);
