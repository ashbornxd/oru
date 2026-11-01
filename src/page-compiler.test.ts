import test from "node:test";
import assert from "node:assert/strict";
import { parsePage } from "./project.js";
import { routeForPage } from "./routes.js";
import { compilePage } from "./page-compiler.js";

test("emits an accessible Canvas page shell with safely escaped metadata", () => {
  const page = parsePage('metadata:\n    title: "A <safe> title"\n    description: "Description"\npage:\n    column:\n        text("Hello")\n        button("Continue")\n');
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.match(html, /<canvas role="img"/);
  assert.match(html, /A &lt;safe&gt; title/);
  assert.match(html, /oru-controls/);
  assert.match(html, /Continue/);
});