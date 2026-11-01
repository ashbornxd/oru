import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { compileProject } from "../../dist/project-build.js";
import { contentSecurityPolicy } from "../../dist/security.js";

let root;
let server;
let baseURL;

test.beforeAll(async () => {
  const projectRoot = resolve("examples/showcase");
  root = await mkdtemp(join(tmpdir(), "oru-showcase-"));
  const output = await compileProject(projectRoot);
  for (const [filename, content] of output) {
    const target = join(root, filename);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  await cp(join(projectRoot, "assets"), join(root, "assets"), { recursive: true });

  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml"
  };
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
      const cleanPath = pathname.split("/").filter(Boolean).join("/");
      const relative = !cleanPath ? "index.html" : cleanPath.includes(".") ? cleanPath : join(cleanPath, "index.html");
      const target = resolve(root, relative);
      if (target !== root && !target.startsWith(root + sep)) throw new Error("Invalid path");
      const body = await readFile(target);
      const headers = {
        "content-type": mime[extname(target)] ?? "application/octet-stream",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-frame-options": "DENY"
      };
      if (extname(target) === ".html") headers["content-security-policy"] = contentSecurityPolicy(body.toString("utf8"));
      response.writeHead(200, headers);
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
  await new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  if (server) await new Promise(resolveClose => server.close(resolveClose));
  if (root) await rm(root, { recursive: true, force: true });
});

test("showcase home, async actions, routes, and session globals work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL);
  await expect(page).toHaveTitle("ORU 1.0 Showcase");
  await expect(page.getByRole("img", { name: "ORU geometric mark" })).toHaveCount(1);

  await page.getByRole("button", { name: "Run async greeting" }).click();
  await expect(page.locator("#oru-semantic")).toContainText("Async function imported from lib/helpers.oru is working.");

  await page.getByRole("button", { name: "Count this visit" }).click();
  await expect(page.locator("#oru-semantic")).toContainText("1");

  await page.getByRole("link", { name: "Open language lab" }).click();
  await expect(page).toHaveURL(/\/lab$/);
  await page.getByRole("button", { name: "Run language demo" }).click();
  await expect(page.locator("#oru-semantic")).toContainText("Hello, ORU. This text came from an imported function.");
  await expect(page.locator("#oru-semantic")).toContainText("10");
  await expect(page.locator("#oru-semantic")).toContainText("5");
  await page.getByRole("button", { name: "Run async demo" }).click();
  await expect(page.locator("#oru-semantic")).toContainText("Async function imported from lib/helpers.oru is working.");

  await page.getByRole("link", { name: "Back home" }).click();
  await expect(page.locator("#oru-semantic")).toContainText("1");
  expect(errors).toEqual([]);
});

test("showcase form covers native validation, matching fields, and file names", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL + "/contact");

  const submit = page.getByRole("button", { name: "Validate demo form" });
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("Email address");

  await page.evaluate(() => { window.__oruEmailBeforeInput = document.querySelector('[aria-label="Email address"]'); });
  await page.getByLabel("Email address").fill("tester@example.com");
  expect(await page.getByLabel("Email address").evaluate(el => el === window.__oruEmailBeforeInput)).toBe(true);
  await page.getByLabel("What are you building?").selectOption("browser-app");
  await page.getByLabel("Project description").fill("Testing the complete ORU showcase.");
  await page.getByLabel("Demo passphrase").fill("first-value");
  await page.getByLabel("Confirm passphrase").fill("different-value");
  await page.getByLabel("Optional attachment (filename only)").setInputFiles({
    name: "sample.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("filename-only test")
  });
  await expect(page.locator("#oru-semantic")).toContainText("Selected: sample.pdf");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("Confirm passphrase");

  await page.getByLabel("Confirm passphrase").fill("first-value");
  await submit.click();
  await expect(page.locator("#oru-semantic")).toContainText("Form passed validation. No data was sent.");
  expect(errors).toEqual([]);
});

test("showcase layout fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await expect(page.getByRole("button", { name: "Run async greeting" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
