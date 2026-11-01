import test from "node:test";
import assert from "node:assert/strict";
import { parsePage } from "./project.js";
import { routeForPage } from "./routes.js";
import { compilePage } from "./page-compiler.js";

test("emits an accessible Canvas page shell and safely escaped metadata", () => {
  const page = parsePage(`metadata:
    title: "A <safe> title"
    description: "Description"
page:
    column:
        text("Hello")
        button("Continue")
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('<canvas role="img"'));
  assert.ok(html.includes("A &lt;safe&gt; title"));
  assert.ok(html.includes("oru-controls"));
  assert.ok(html.includes("Continue"));
});

test("loads page logic and wires button click handlers", () => {
  const page = parsePage(`logic:
    func save():
        print("saved")
page:
    button("Save"):
        on.click: save
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('import { run } from "./_oru/core.js";'));
  assert.ok(html.includes("app.call(String(handler))"));
  assert.ok(html.includes('type="module"'));
});

test("uses a relative interpreter path for nested routes", () => {
  const page = parsePage(`logic:
    func help():
        print("help")
page:
    button("Help"):
        on.click: help
`);
  const html = compilePage(page, routeForPage("pages/help.oru"), { "pages/help": "/pages/help" });
  assert.ok(html.includes('import { run } from "../../_oru/core.js";'));
});