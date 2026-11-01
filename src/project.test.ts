import test from "node:test";
import assert from "node:assert/strict";
import { parsePage } from "./project.js";

test("parses page metadata and nested widgets", () => {
  const page = parsePage(`metadata:
    title: "Hello ORU"
    description: "A test page"
    language: "en"
page:
    column:
        text("Welcome"):
            color: #ffffff
        button("Continue"):
            on.click: submit
`, "index.oru");
  assert.equal(page.metadata.title, "Hello ORU");
  assert.equal(page.widgets[0]?.type, "column");
  assert.equal(page.widgets[0]?.children[0]?.text, "Welcome");
  assert.equal(page.widgets[0]?.children[1]?.properties["on.click"], "submit");
});

test("requires one page block and rejects unknown widgets", () => {
  assert.throws(() => parsePage("metadata:\n    title: \"X\""), /must contain a page/);
  assert.throws(() => parsePage("page:\n    sparkle:"), /Unknown widget/);
});

test("rejects duplicate page blocks and malformed indentation", () => {
  assert.throws(() => parsePage("page:\n    text(\"a\"):\npage:"), /exactly one page/);
  assert.throws(() => parsePage("page:\n     text(\"a\"):"), /four-space/);
});

test("parses leaf widgets, image sources, and input placeholders", () => {
  const page = parsePage(`page:
    column:
        text("No trailing colon")
        image("assets/logo.png", "Logo")
        input("Email")
`);
  const column = page.widgets[0]!;
  assert.equal(column.children[0]?.text, "No trailing colon");
  assert.equal(column.children[1]?.properties.src, "assets/logo.png");
  assert.equal(column.children[1]?.text, "Logo");
  assert.equal(column.children[2]?.properties.placeholder, "Email");
});

test("parses page-local logic and event properties", () => {
  const page = parsePage(`metadata:
    title: "Counter"
logic:
    func increment():
        print("clicked")
page:
    button("Increment"):
        on.click: increment
`);
  assert.match(page.logic, /func increment/);
  assert.match(page.logic, /print\("clicked"\)/);
  assert.equal(page.widgets[0]?.properties["on.click"], "increment");
});
