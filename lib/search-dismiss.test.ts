import assert from "node:assert/strict";
import test from "node:test";
import { closesSearchOnPointer } from "./search-dismiss.ts";

const missing = "/indberettet/stof/wegovy/";
const home = "/indberettet/";

test("et link til en anden adresse lukker ikke listen", () => {
  assert.equal(closesSearchOnPointer(false, "/indberettet/soeg/?q=wegovy", missing), false);
  assert.equal(closesSearchOnPointer(false, "/soeg/?q=wegovy", missing), false);
});

test("samme side og klik uden link lukker listen", () => {
  assert.equal(closesSearchOnPointer(false, "/indberettet/", home), true);
  assert.equal(closesSearchOnPointer(false, "#indhold", home), true);
  assert.equal(closesSearchOnPointer(false, null, home), true);
});

test("et link inde i søgningen får lov at blive klikket", () => {
  assert.equal(closesSearchOnPointer(true, "/indberettet/soeg/?q=vioxx", home), false);
  assert.equal(closesSearchOnPointer(true, "/indberettet/stof/paracetamolum/", home), false);
});
