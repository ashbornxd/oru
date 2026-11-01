import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { compileProject } from "./project-build.js";
import { runAsync } from "./core.js";

test("builds the complete ORU 1.0 showcase website", async () => {
  const root = resolve("examples/showcase");
  const files = await compileProject(root);

  for (const route of [
    "index.html",
    "lab/index.html",
    "contact/index.html",
    "lib/theme/index.html",
    "lib/helpers/index.html"
  ]) {
    assert.ok(files.has(route), "Missing generated route: " + route);
    assert.match(files.get(route) ?? "", /<canvas/);
    assert.match(files.get(route) ?? "", /oru-semantic/);
  }

  const home = files.get("index.html") ?? "";
  assert.match(home, /Hello, /);
  assert.match(home, /1\.0\.0-dev/);
  assert.match(home, /assets\/oru-mark\.svg/);
  assert.match(home, /assets\/arrow\.svg/);
  assert.match(home, /getGreeting/);
  assert.ok(files.has("_oru/core.js"));
  assert.ok(files.has("_oru/ast.js"));
});

test("showcase imported async helpers and language examples execute", async () => {
  const helpers = `APP_VERSION = "1.0.0-dev"
func welcome(name):
    return "Hello, " + name
async func getGreeting():
    return "Imported async helper ready"
`;
  const program = await runAsync(`${helpers}
state output = ""
async func runDemo():
    greeting = await getGreeting()
    output = welcome("ORU") + " / " + greeting
`);
  await program.callAsync("runDemo");
  assert.equal(
    program.getGlobals().output,
    "Hello, ORU / Imported async helper ready"
  );
});
