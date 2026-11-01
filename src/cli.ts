#!/usr/bin/env node
import { createServer } from "node:http";
import { watch } from "node:fs";
import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { compileProject } from "./project-build.js";
import { run as runLanguage } from "./core.js";

const VERSION = "1.0.0-dev.0";
const STARTER = `metadata:
    title: "My website"
    description: "A website built with ORU."
page:
    column:
        text("Hello, ORU!"):
            size: 32
        text("Your website starts here.")
`;

function help(): void {
  console.log(`ORU ${VERSION}

Usage:
  oru create <name>     Create a project
  oru eval <file>       Run a general-purpose ORU script\n  oru build             Build for production
  oru run dev           Start the local development server
  oru --help
  oru --version

Options:
  --port <number>       Development server port (default: 3000)
  --out <directory>     Build output directory (default: dist)

Examples:
  oru create myWeb
  cd myWeb
  oru run dev
  oru build
`);
}

function option(args: string[], name: string, fallback: string): string {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

async function createProject(name: string): Promise<void> {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) {
    throw new Error("Use a simple project name (letters, numbers, hyphens, underscores).");
  }

  const target = resolve(name);
  await mkdir(target, { recursive: true });

  try {
    await access(join(target, "oru.config"));
    throw new Error(`"${name}" already contains an ORU project. Nothing was changed.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already contains")) throw error;
  }

  await writeFile(join(target, "oru.config"), `name: "${name}"\n`, { flag: "wx" });
  await writeFile(join(target, "index.oru"), STARTER, { flag: "wx" });
  console.log(`Created ${name}/ with oru.config and index.oru`);
  console.log(`Next: cd ${name} && oru run dev`);
}

async function cleanOutput(output: string): Promise<string> {
  const root = resolve(output);
  const cwd = resolve(".");
  const relative = root.slice(cwd.length + 1);
  const firstSegment = relative.split(sep)[0] ?? "";

  if (
    root === cwd ||
    !root.startsWith(cwd + sep) ||
    ["assets", "src", ".git", "node_modules"].includes(firstSegment)
  ) {
    throw new Error("Build output must be a separate folder inside the project, such as dist/ or public/.");
  }

  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  return root;
}

async function evaluateFile(input: string): Promise<void> {
  const source = await readFile(resolve(input), "utf8");
  runLanguage(source, { output: value => console.log(typeof value === "string" ? value : JSON.stringify(value)) });
}

async function build(output = "dist"): Promise<void> {
  const files = await compileProject(".");
  const outputRoot = await cleanOutput(output);

  for (const [filename, content] of files) {
    const target = join(outputRoot, filename);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  try {
    await access(resolve("assets"));
    await cp(resolve("assets"), join(outputRoot, "assets"), { recursive: true });
  } catch {
    // Assets are optional.
  }

  console.log(`Built ${files.size} page(s) → ${output}/`);
}

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

async function runDev(port: number): Promise<void> {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port must be a number between 1 and 65535.");
  }

  let building = false;

  const rebuild = async () => {
    if (building) return;
    building = true;
    try {
      await build("dist");
      console.log("Ready for preview.");
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    } finally {
      building = false;
    }
  };

  await rebuild();
  const root = resolve("dist");

  createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent((request.url ?? "/").split("?")[0] ?? "/");
      const cleanPath = pathname.split("/").filter(Boolean).join("/");
      const relativePath = !cleanPath ? "index.html" : cleanPath.includes(".") ? cleanPath : join(cleanPath, "index.html");
      const file = resolve(root, relativePath);
      if (file !== root && !file.startsWith(root + sep)) throw new Error("Invalid path");
      const data = await readFile(file);
      response.writeHead(200, { "content-type": mimeTypes[extname(file)] ?? "application/octet-stream" });
      response.end(data);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  }).listen(port, "127.0.0.1", () => {
    console.log(`ORU dev server → http://localhost:${port}`);
    console.log("Watching ORU project files for changes. Press Ctrl+C to stop.");
  });

  watch(resolve("."), { recursive: true }, (_event, filename) => {
    if (filename && (String(filename).endsWith(".oru") || String(filename) === "oru.config")) void rebuild();
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") return help();
  if (command === "--version" || command === "-v") {
    console.log(VERSION);
    return;
  }

  if (command === "create") {
    await createProject(args[1] ?? "");
    return;
  }

  if (command === "eval") {
    const file = args[1];
    if (!file) throw new Error("Provide an ORU script file, for example: oru eval script.oru");
    await evaluateFile(file);
    return;
  }

  if (command === "build") {
    await build(option(args, "--out", "dist"));
    return;
  }

  if (command === "dev" || (command === "run" && args[1] === "dev")) {
    await runDev(Number(option(args, "--port", "3000")));
    return;
  }

  help();
  process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
