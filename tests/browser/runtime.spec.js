import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { compileProject } from "../../dist/project-build.js";

let root;
let server;
let baseURL;

test.beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "oru-browser-"));
  await writeFile(join(root, "oru.config"), 'name: "ORU browser test"\n');
  await writeFile(join(root, "index.oru"), `logic:
    state selected = ""
    state submitted = false
    func submit():
        submitted = true
page:
    column:
        text(selected)
        text(submitted)
        row:
            text("Responsive left")
            text("Responsive right")
        form:
            label: File upload
            on.submit: submit
            input(selected):
                type: file
                accept: ".txt"
                required: true
                label: Choose a file
            button("Send")
`);

  const output = await compileProject(root);
  const pageHTML = output.get("index.html");
  const inlineScript = pageHTML?.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  if (!inlineScript) throw new Error("Compiled page is missing its module runtime.");
  new Function(inlineScript.trimStart().replace(/^import\s+\{\s*run\s*\}\s+from\s+"[^"]+";\s*/, ""));
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
        "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
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
  page.on("pageerror", error => runtimeErrors.push("PAGEERROR " + error.message + " STACK " + String(error.stack)));
  page.on("console", message => runtimeErrors.push("CONSOLE " + message.type() + " " + message.text() + " @ " + JSON.stringify(message.location())));
  const response = await page.goto(baseURL);
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");

  const file = page.getByLabel("Choose a file");
  const send = page.locator("#oru-controls button");
  const bodyHTML = await page.locator("body").innerHTML();
  await expect(send, (runtimeErrors.join("\\n") || "No browser errors were captured") + " BODY: " + bodyHTML).toHaveCount(1);
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
