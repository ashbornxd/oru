import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./compiler.js";
import { parse } from "./parser.js";

test("compiles a basic page to HTML", () => {
  const result = compile(`title = "Test site"

page index:
    section:
        heading("Hello, ORU"):
            font-size = 32px
            text-align = center
        text("A paragraph.")
`);
  const html = result.files.get("index.html");
  assert.ok(html);
  assert.match(html, /<title>Test site<\/title>/);
  assert.match(html, /<h1[^>]*>Hello, ORU<\/h1>/);
  assert.match(html, /A paragraph\./);
  assert.match(html, /text-align:center/);
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

test("supports reusable classes and text style shortcuts", () => {
  const document = parse(`class Card:
    text-size = 18px
    text-color = navy

page index:
    Card:
        text("Inside the card")
`);
  assert.equal(document.classes.get("Card")?.styles["font-size"], "18px");
  assert.equal(document.classes.get("Card")?.styles.color, "navy");
});

test("reports unknown elements with a line number", () => {
  assert.throws(
    () => parse(`page index:
    sparkle("Nope")
`),
    /Line 2: Unknown element "sparkle"/
  );
});
