import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileProject } from "./project-build.js";

test("compiles a multi-page project into safe static routes", async () => {
  const root = await mkdtemp(join(tmpdir(), "oru-project-"));
  try {
    await mkdir(join(root, "pages"));
    await writeFile(join(root, "oru.config"), 'name: "Example"\n');
    await writeFile(join(root, "index.oru"), 'metadata:\n    title: "Home"\npage:\n    column:\n        text("Welcome"):\n');
    await writeFile(join(root, "pages", "help.oru"), 'metadata:\n    title: "Help"\npage:\n    text("Support"):\n');
    const files = await compileProject(root);
    assert.equal(files.size, 2);
    assert.match(files.get("index.html") ?? "", /<canvas/);
    assert.match(files.get("pages/help/index.html") ?? "", /Help/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires project configuration and the index page", async () => {
  const root = await mkdtemp(join(tmpdir(), "oru-project-"));
  try {
    await writeFile(join(root, "about.oru"), 'page:\n    text("About"):\n');
    await assert.rejects(() => compileProject(root), /missing required "oru.config"/);
    await writeFile(join(root, "oru.config"), 'name: "Example"\n');
    await assert.rejects(() => compileProject(root), /missing.*index.oru/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("resolves named and namespace style imports between page files", async () => {
  const root = await mkdtemp(join(tmpdir(), "oru-imports-"));
  try {
    await writeFile(join(root, "oru.config"), 'name: "Imports"\n');
    await writeFile(join(root, "theme.oru"), `class navText:
    color: #123456
    size: 22
page:
    text("Theme module")
`);
    await writeFile(join(root, "index.oru"), `from theme import navText
page:
    text("Named import"):
        class: navText
`);
    await writeFile(join(root, "about.oru"), `import theme
page:
    text("Namespace import"):
        class: theme.navText
`);
    const files = await compileProject(root);
    assert.equal(files.size, 3);
    assert.ok(files.get("index.html")?.includes("#123456"));
    assert.ok(files.get("about/index.html")?.includes("#123456"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects circular style imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "oru-cycles-"));
  try {
    await writeFile(join(root, "oru.config"), 'name: "Cycles"\n');
    await writeFile(join(root, "index.oru"), `import about
page:
    text("Home")
`);
    await writeFile(join(root, "about.oru"), `import index
page:
    text("About")
`);
    await assert.rejects(() => compileProject(root), /Circular ORU module import/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("imports named functions and values into page logic", async () => {
  const root = await mkdtemp(join(tmpdir(), "oru-logic-imports-"));
  try {
    await writeFile(join(root, "oru.config"), 'name: "Logic imports"\n');
    await writeFile(join(root, "utils.oru"), `logic:
    APP_NAME = "ORU"
    func greet(name):
        return "Hello " + name
    func unused():
        return "not imported"
page:
    text("Utilities")
`);
    await writeFile(join(root, "index.oru"), `from utils import greet, APP_NAME
logic:
    state message = greet(APP_NAME)
page:
    text(message)
`);
    const files = await compileProject(root, { includeRuntime: false });
    const html = files.get("index.html") ?? "";
    assert.ok(html.includes('func greet(name)'));
    assert.ok(html.includes("APP_NAME ="));
    assert.ok(!html.includes('func unused()'));
    assert.ok(html.includes('state message = greet(APP_NAME)'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects missing, stateful, and colliding logic imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "oru-logic-import-errors-"));
  try {
    await writeFile(join(root, "oru.config"), 'name: "Logic imports"\n');
    await writeFile(join(root, "utils.oru"), `logic:
    state internal = 1
    func greet():
        return "hello"
page:
    text("Utilities")
`);
    await writeFile(join(root, "index.oru"), `from utils import missing
page:
    text("Home")
`);
    await assert.rejects(() => compileProject(root), /was not exported/);
    await writeFile(join(root, "index.oru"), `from utils import internal
page:
    text("Home")
`);
    await assert.rejects(() => compileProject(root), /was not exported/);
    await writeFile(join(root, "index.oru"), `from utils import greet
logic:
    func greet():
        return "local"
page:
    text("Home")
`);
    await assert.rejects(() => compileProject(root), /conflicts with an existing declaration/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test("rejects unsafe, missing, and symlinked image assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "oru-assets-"));
  try {
    await writeFile(join(root, "oru.config"), 'name: "Assets"\n');
    await writeFile(join(root, "index.oru"), 'page:\n    image("../outside.png", "Bad path")\n');
    await assert.rejects(() => compileProject(root), /inside assets/);

    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.oru"), 'page:\n    image("assets/missing.png", "Missing")\n');
    await assert.rejects(() => compileProject(root), /asset was not found/);

    const outside = join(root, "outside.png");
    await writeFile(outside, "not an image");
    await symlink(outside, join(root, "assets", "linked.png"));
    await writeFile(join(root, "index.oru"), 'page:\n    image("https://cdn.example.com/logo.png", "Remote")\n');
    await assert.rejects(() => compileProject(root), /symbolic links/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("allows safe project assets and HTTPS image URLs", async () => {
  const root = await mkdtemp(join(tmpdir(), "oru-safe-assets-"));
  try {
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "assets", "logo.png"), "image");
    await writeFile(join(root, "oru.config"), 'name: "Assets"\n');
    await writeFile(join(root, "index.oru"), `page:
    column:
        image("assets/logo.png", "Local logo")
        image("https://cdn.example.com/remote.png", "Remote logo")
`);
    const files = await compileProject(root);
    assert.ok(files.get("index.html")?.includes("assets/logo.png"));
    assert.ok(files.get("index.html")?.includes("https://cdn.example.com/remote.png"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
