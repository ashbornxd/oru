import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./compiler.js";
import { parse } from "./parser.js";

test("compiles the redesigned semantic syntax", () => {
  const result = compile(`title = "ORU"

page index:
    section:
        section.background = "#f5f5f5"
        section.padding = 32
        heading("Hello"):
            heading.size = 48
            heading.color = navy
        text("A paragraph"):
            text.size = 18
            text.color = "#444"
        button("Start", "go about"):
            button.background = blue
            button.radius = 12
`);
  const html = result.files.get("index.html")!;
  assert.match(html, /<title>ORU<\/title>/);
  assert.match(html, /background-color:#f5f5f5/);
  assert.match(html, /font-size:clamp\(/);
  assert.match(html, /data-oru-action="go about"/);
  assert.match(html, /border-radius:12/);
});

test("creates responsive stack and auto-fit grid layouts", () => {
  const html = compile(`page index:
    stack:
        stack.gap = 20
        text("One")
    grid:
        grid.columns = 3
        text("Card")
`).files.get("index.html")!;
  assert.match(html, /\.oru-stack\{display:flex/);
  assert.match(html, /repeat\(auto-fit/);
  assert.match(html, /@media\(max-width:640px\)/);
});

test("supports reusable classes", () => {
  const doc = parse(`class Card:
    class.background = white
    class.padding = 24

page index:
    Card:
        text("Reusable")
`);
  assert.equal(doc.classes.get("Card")?.styles["class.background"], "white");
});

test("rejects old CSS-style properties and invalid style scopes", () => {
  assert.throws(() => parse(`page index:
    text("Hello"):
        font-size = 20px
`), /Use text.property/);
  assert.throws(() => compile(`page index:
    text("Hello"):
        text.unknown = value
`), /Unknown text style/);
});

test("rejects unknown elements with a line number", () => {
  assert.throws(() => parse(`page index:
    sparkle("Nope")
`), /Line 2: Unknown element "sparkle"/);
});

test("supports multiple pages", () => {
  const result = compile(`page index:
    heading("Home")
page about:
    heading("About")
`);
  assert.equal(result.files.size, 2);
  assert.ok(result.files.has("index.html"));
  assert.ok(result.files.has("about.html"));
});
