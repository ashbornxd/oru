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
test("binds page text to mutable ORU state", () => {
  const page = parsePage(`logic:
    state count = 0
    func increment():
        count = count + 1
page:
    column:
        text(count)
        button("Add"):
            on.click: increment
`);
  assert.equal(page.widgets[0]?.children[0]?.binding, "count");
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes("app.getGlobals()"));
});
test("applies compatible page-local style classes to widgets", () => {
  const page = parsePage(`class navText:
    color: #123456
    size: 24
page:
    text("Styled"):
        class: navText
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes("#123456"));
  assert.ok(html.includes('"size":24'));
});

test("rejects style properties that do not match a widget type", () => {
  const page = parsePage(`class navText:
    radius: 8
page:
    text("Styled"):
        class: navText
`);
  assert.throws(() => compilePage(page, routeForPage("index.oru"), { index: "/" }), /not supported by text/);
});
test("binds input values to page state and updates the interpreter", () => {
  const page = parsePage(`logic:
    state email = pass
page:
    input(email):
        type: email
        required: true
`);
  assert.equal(page.widgets[0]?.binding, "email");
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes("app.set(node.binding, el.value)"));
  assert.ok(html.includes("el.required = true"));
});