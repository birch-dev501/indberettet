import assert from "node:assert/strict";
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
