import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { OruError } from "./ast.js";
import { parsePage } from "./project.js";
import { buildRouteTable } from "./routes.js";
import { compilePage } from "./page-compiler.js";

async function findPages(root: string, directory = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || ["node_modules", "dist", "target"].includes(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await findPages(root, fullPath));
    else if (entry.isFile() && entry.name.endsWith(".oru")) found.push(relative(root, fullPath).split(sep).join("/"));
  }
  return found;
}

async function validateConfig(root: string): Promise<void> {
  let source: string;
  try {
    source = await readFile(join(root, "oru.config"), "utf8");
  } catch {
    throw new OruError('Project is missing required "oru.config". Create it with: name: "My Project".');
  }
  const lines = source.replace(/\r\n?/g, "\n").split("\n").map(line => line.trim()).filter(Boolean);
  if (lines.length !== 1) throw new OruError('oru.config must contain exactly one field: name: "Project Name".');
  const match = lines[0]!.match(/^name\s*:\s*(["'])(.{1,64})\1$/);
  if (!match) throw new OruError('Invalid oru.config. Expected name: "Project Name".');
}

export async function compileProject(projectDirectory = "."): Promise<Map<string, string>> {
  const root = resolve(projectDirectory);
  await validateConfig(root);
  const sources = (await findPages(root)).sort();
  const routeTable = buildRouteTable(sources);
  const parsed = new Map<string, ReturnType<typeof parsePage>>();
  for (const source of sources) {
    parsed.set(source, parsePage(await readFile(join(root, source), "utf8"), source));
  }
  const routeMap: Record<string, string> = {};
  for (const page of routeTable.values()) {
    routeMap[page.source.slice(0, -4)] = page.route;
  }
  const output = new Map<string, string>();
  for (const pageRoute of routeTable.values()) {
    const page = parsed.get(pageRoute.source)!;
    output.set(pageRoute.output, compilePage(page, pageRoute, routeMap));
  }
  if ([...parsed.values()].some(page => page.logic.trim().length > 0)) {
    const moduleDirectory = dirname(fileURLToPath(import.meta.url));
    const runtimeDirectories = [moduleDirectory, resolve(moduleDirectory, "../dist")];
    for (const filename of ["core.js", "ast.js"]) {
      let runtimeSource: string | undefined;
      for (const directory of runtimeDirectories) {
        try {
          runtimeSource = await readFile(join(directory, filename), "utf8");
          break;
        } catch {
          // Try the built package directory.
        }
      }
      if (runtimeSource === undefined) {
        throw new OruError("The ORU browser interpreter is missing. Run npm run build before building pages with logic:.");
      }
      output.set("_oru/" + filename, runtimeSource);
    }
  }
  return output;
}
