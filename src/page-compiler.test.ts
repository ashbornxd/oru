import test from "node:test";
import assert from "node:assert/strict";
import { parsePage } from "./project.js";
import { routeForPage } from "./routes.js";
import { compilePage } from "./page-compiler.js";

test("emits an accessible Canvas page shell with safely escaped metadata", () => {
  const page = parsePage('metadata:\n    title: "A <safe> title"\n    description: "Description"\nlogic:\n    func continueAction():\n        print("continued")\npage:\n    column:\n        text("Hello")\n        button("Continue"):\n            on.click: continueAction\n');
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.match(html, /<canvas role="img"/);
  assert.match(html, /A &lt;safe&gt; title/);
  assert.match(html, /oru-controls/);
  assert.match(html, /Continue/);\n  assert.match(html, /import \\{ run \\} from "\.\\/_oru\\/core\\.js"/);\n  assert.match(html, /app\\.call/);
});