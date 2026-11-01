import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { compileProject } from "../../dist/project-build.js";
import { contentSecurityPolicy } from "../../dist/security.js";

let root;
let server;
let baseURL;

test.beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "oru-browser-"));
  await writeFile(join(root, "oru.config"), 'name: "ORU browser test"\n');
  await writeFile(join(root, "index.oru"), `logic:
    state selected = ""
    state submitted = false
    state passwordValue = ""
    state confirmation = ""
    state verified = false
    func submit():
        submitted = true
    func verify():
        verified = true
page:
    column:
        text(selected)
        text(submitted)
        text(verified)
        row:
            wrapAt: 600
            mainAlign: spaceBetween
            crossAlign: center
            button("First"):
                width: 80
            button("Second"):
                width: 80
        form:
            label: File upload
            on.submit: submit
            input(selected):
                type: file
                accept: ".txt"
                required: true
                label: Choose a file
            button("Send")
        form:
            label: Password verification
            on.submit: verify
            validationSummary: true
            input(passwordValue):
                type: password
                required: true
                label: Password
            input(confirmation):
                type: password
                required: true
                matches: passwordValue
                validationMessage: "Passwords must match."
                label: Confirm password
            button("Verify")
`);

  const output = await compileProject(root);
  const pageHTML = output.get("index.html");
  const inlineScript = pageHTML?.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  if (!inlineScript) throw new Error("Compiled page is missing its module runtime.");
  const executableSource = inlineScript.trimStart().replace(/^import\s+\{\s*run\s*\}\s+from\s+"[^"]+";\s*/, "");
  try {
    new Function(executableSource);
  } catch (error) {
    const numbered = executableSource.split("\n").map((line, index) => (index + 1) + ": " + line).join("\n");
    throw new Error(String(error) + "\n" + numbered);
  }
  for (const [filename, content] of output) {
    const target = join(root, filename);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
  };
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
      const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const target = resolve(root, relative);
      if (target !== root && !target.startsWith(root + sep)) throw new Error("Invalid path");
      const body = await readFile(target);
      response.writeHead(200, {
        "content-type": mime[extname(target)] ?? "application/octet-stream",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "content-security-policy": contentSecurityPolicy(body.toString("utf8"))
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  if (server) await new Promise(resolveClose => server.close(resolveClose));
  if (root) await rm(root, { recursive: true, force: true });
});

test("native file selection keeps the FileList for required form submission", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") runtimeErrors.push(message.text()); });
  const response = await page.goto(baseURL);
  expect(response?.status()).toBe(200);
  const policy = response?.headers()["content-security-policy"] ?? "";
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("script-src 'self' 'sha256-");
  expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  expect(policy).toContain("style-src-attr 'none'");

  const file = page.getByLabel("Choose a file");
  const send = page.locator('#oru-controls button[aria-label="Send"]');
  await expect(send, runtimeErrors.join("\\n") || "ORU controls were not rendered").toHaveCount(1);
  expect(await send.getAttribute("aria-label")).toBe("Send");
  await send.click();
  await expect(page.locator("#oru-semantic")).toContainText("false");

  await file.setInputFiles({
    name: "sample.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("ORU browser test")
  });
  await expect(page.locator("#oru-semantic")).toContainText("Selected: sample.txt");
  await send.click();
  await expect(page.locator("#oru-semantic")).toContainText("true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});


test("reflows aligned controls across desktop and mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL);
  const first = page.locator('#oru-controls button[aria-label="First"]');
  const second = page.locator('#oru-controls button[aria-label="Second"]');
  await expect(first).toHaveCount(1);
  await expect(second).toHaveCount(1);
  const desktopFirst = await first.boundingBox();
  const desktopSecond = await second.boundingBox();
  expect(desktopSecond.x).toBeGreaterThan(desktopFirst.x + 400);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => {
    const firstBox = await first.boundingBox();
    const secondBox = await second.boundingBox();
    return Boolean(firstBox && secondBox && secondBox.y > firstBox.y);
  }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});


test("validates matching fields and announces a form error summary", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL);

  const password = page.locator('#oru-controls input[type="password"][aria-label="Password"]');
  const confirmation = page.locator('#oru-controls input[type="password"][aria-label="Confirm password"]');
  const verify = page.locator('#oru-controls button[aria-label="Verify"]');
  await password.fill("correct-value");
  await confirmation.fill("different-value");
  await verify.click();

  const summary = page.locator('#oru-controls [role="alert"]');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Confirm password");
  await expect(page.locator("#oru-semantic")).toContainText("false");

  await confirmation.fill("correct-value");
  await verify.click();
  await expect(page.locator("#oru-semantic")).toContainText("true");
  expect(errors).toEqual([]);
});


test("keeps native controls keyboard reachable with visible focus and a labelled group", async ({ page }) => {
  await page.goto(baseURL);
  const group = page.getByRole("group", { name: "Page controls" });
  const first = page.locator('#oru-controls button[aria-label="First"]');
  const second = page.locator('#oru-controls button[aria-label="Second"]');
  await expect(group).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  expect(await first.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(second).toBeFocused();
});


test("awaits async click handlers before persisting and rendering state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(baseURL);
  const action = page.locator('#oru-controls button[aria-label="Async action"]');
  await expect(action).toHaveCount(1);
  await expect(page.locator("#oru-semantic")).toContainText("false");
  await action.click();
  await expect(page.locator("#oru-semantic")).toContainText("true");
  expect(errors).toEqual([]);
});
