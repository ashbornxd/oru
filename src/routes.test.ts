import test from "node:test";
import assert from "node:assert/strict";
import { buildRouteTable, routeForPage } from "./routes.js";

test("maps page paths to extensionless routes and safe output paths", () => {
  assert.deepEqual(routeForPage("index.oru"), { source: "index.oru", route: "/", output: "index.html" });
  assert.equal(routeForPage("about.oru").route, "/about");
  assert.equal(routeForPage("pages/help.oru").route, "/pages/help");
  assert.equal(routeForPage("pages/help.oru").output, "pages/help/index.html");
});

test("rejects traversal, absolute paths, and wrong extensions", () => {
  assert.throws(() => routeForPage("../secret.oru"), /invalid directory/);
  assert.throws(() => routeForPage("/index.oru"), /project-relative/);
  assert.throws(() => routeForPage("index.txt"), /\.oru extension/);
});

test("requires index and rejects duplicate routes", () => {
  assert.throws(() => buildRouteTable(["about.oru"]), /missing.*index.oru/);
  assert.throws(() => buildRouteTable(["index.oru", "index.oru"]), /discovered more than once/);
});
