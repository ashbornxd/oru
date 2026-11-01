import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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