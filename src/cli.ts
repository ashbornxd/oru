#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { compile } from "./compiler.js";

function help(): void {
  console.log(`ORU 0.1.0

Build simple websites with the ORU language.

Usage:
  oru build [file.oru] [--out directory]
  oru dev [file.oru] [--port 3000]
  oru --help

Examples:
  oru build
  oru build website.oru --out public
  oru dev
`);
}

function option(args: string[], name: string, fallback: string): string {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

async function build(input: string, output: string): Promise<void> {
  const source = await readFile(resolve(input), "utf8");
  const result = compile(source);
  await mkdir(resolve(output), { recursive: true });
  for (const [filename, content] of result.files) {
    await writeFile(join(resolve(output), filename), content, "utf8");
    console.log(`  created ${join(output, filename)}`);
  }
  console.log(`Built ${result.files.size} page(s) into ${output}/`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command || command === "--help" || command === "-h") return help();

  const input = args[1] && !args[1]!.startsWith("--") ? args[1]! : "main.oru";
  const output = option(args, "--out", "dist");

  if (command === "build" || command === "compile") {
    await build(input, output);
    return;
  }

  if (command === "dev") {
    await build(input, "dist");
    const port = Number(option(args, "--port", "3000"));
    const root = resolve("dist");
    createServer(async (request, response) => {
      try {
        const requested = decodeURIComponent((request.url ?? "/").split("?")[0] ?? "/");
        const safePath = normalize(requested).replace(/^([.][.][/\\])+/, "");
        const filename = safePath === "/" ? "index.html" : safePath.replace(/^[/\\]/, "");
        const file = resolve(root, filename);
        if (!file.startsWith(root)) throw new Error("Invalid path");
        const data = await readFile(file);
        const type = extname(file) === ".html" ? "text/html; charset=utf-8" : "application/octet-stream";
        response.writeHead(200, { "content-type": type });
        response.end(data);
      } catch {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
      }
    }).listen(port, "0.0.0.0", () => {
      console.log(`ORU is running at http://localhost:${port}`);
    });
    return;
  }

  help();
  process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
