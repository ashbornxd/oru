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
