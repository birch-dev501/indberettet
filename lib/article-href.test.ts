import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { isSitePath, sitePathHref } from "./article-href.ts";

test("interne stier får basePath og afsluttende skråstreg", () => {
  assert.equal(isSitePath("/stof/infliximab"), true);
  assert.equal(isSitePath("/forstaa-forskning"), true);
  assert.equal(isSitePath("https://example.com/a"), false);
  assert.equal(isSitePath("//evil.example/a"), false);
  assert.equal(sitePathHref("/stof/infliximab"), "/indberettet/stof/infliximab/");
  assert.equal(sitePathHref("/forstaa-forskning"), "/indberettet/forstaa-forskning/");
  assert.equal(sitePathHref("/stof/infliximab/"), "/indberettet/stof/infliximab/");
  assert.equal(sitePathHref("/indberettet/stof/infliximab"), "/indberettet/stof/infliximab/");
  assert.equal(sitePathHref("https://www.meldenbivirkning.dk"), "https://www.meldenbivirkning.dk");
  assert.equal(sitePathHref("/stof/infliximab#praeparater"), "/indberettet/stof/infliximab/#praeparater");
});

test("byggede html-filer har basePath på interne href", () => {
  const outDir = "out";
  assert.equal(existsSync(outDir), true, "out/ findes ikke. Kør npm run build først.");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) files.push(full);
    }
  };
  walk(outDir);
  assert.ok(files.length > 0, "ingen html-filer i out/. Kør npm run build først.");
  const bare: string[] = [];
  const hrefRe = /href="(\/[^"]*)"/g;
  for (const file of files) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(hrefRe)) {
      const href = match[1];
      if (href === "/indberettet" || href.startsWith("/indberettet/")) continue;
      bare.push(`${file}: ${href}`);
    }
  }
  assert.equal(bare.length, 0, bare.slice(0, 20).join("\n"));
});
