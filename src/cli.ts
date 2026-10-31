#!/usr/bin/env node
import { createServer } from "node:http";
import { watch } from "node:fs";
import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { compile } from "./compiler.js";

const VERSION = "0.2.0";
const STARTER = `title = "My website"

page index:
    section:
        heading("Hello, ORU!")
        text("Your website starts here.")
`;

function help(): void {
  console.log(`ORU ${VERSION}

Usage:
  oru create <name>     Create a project
  oru build             Build for production
  oru run dev           Start the local development server
  oru --help

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
  if (!name || name.startsWith("-")) throw new Error("Give your project a name: oru create myWebsite");
  const target = resolve(name);
  await mkdir(target, { recursive: true });
  try {
    await access(join(target, "main.oru"));
    throw new Error(`"${name}" already contains a main.oru file. Nothing was changed.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already contains")) throw error;
  }
  await writeFile(join(target, "main.oru"), STARTER, { flag: "wx" });
  console.log(`Created ${name}/main.oru`);
  console.log(`Next: cd ${name} && oru run dev`);
}

async function cleanOutput(output: string): Promise<string> {
  const root = resolve(output);
  const cwd = resolve(".");
  if (root === cwd || root === resolve(cwd, "..") || !root.startsWith(cwd + sep)) {
    throw new Error("Build output must be a folder inside the current project, such as dist/.");
  }
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  return root;
}

async function build(input = "main.oru", output = "dist"): Promise<void> {
  const source = await readFile(resolve(input), "utf8");
  const result = compile(source);
  const outputRoot = await cleanOutput(output);

  for (const [filename, content] of result.files) {
    await writeFile(join(outputRoot, filename), content, "utf8");
  }

  try {
    await access(resolve("assets"));
    await cp(resolve("assets"), join(outputRoot, "assets"), { recursive: true });
  } catch {
    // Assets are optional.
  }

  console.log(`Built ${result.files.size} page(s) → ${output}/`);
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
  const input = resolve("main.oru");
  let building = false;

  const rebuild = async () => {
    if (building) return;
    building = true;
    try {
      await build(input, "dist");
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
      const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const file = resolve(root, relative);
      if (file !== root && !file.startsWith(root + sep)) throw new Error("Invalid path");
      const data = await readFile(file);
      response.writeHead(200, { "content-type": mimeTypes[extname(file)] ?? "application/octet-stream" });
      response.end(data);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  }).listen(port, "0.0.0.0", () => {
    console.log(`ORU dev server → http://localhost:${port}`);
    console.log("Watching main.oru for changes. Press Ctrl+C to stop.");
  });

  watch(input, () => void rebuild());
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command || command === "--help" || command === "-h") return help();

  if (command === "create") {
    await createProject(args[1] ?? "");
    return;
  }

  if (command === "build") {
    await build("main.oru", option(args, "--out", "dist"));
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
