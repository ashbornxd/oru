import { lstat, readFile, readdir } from "node:fs/promises";
import type { Dirent, Stats } from "node:fs";
import { dirname, join, normalize, relative, resolve, sep } from "node:path";
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

async function validateAssetTree(root: string): Promise<void> {
  const assetRoot = join(root, "assets");
  let rootInfo: Stats;
  try {
    rootInfo = await lstat(assetRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    throw new OruError('The project "assets" path must be a regular directory.');
  }
  const entries: Dirent[] = await readdir(assetRoot, { withFileTypes: true });
  const inspect = async (directory: string, children: Dirent[]): Promise<void> => {
    for (const entry of children) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new OruError("Asset directories cannot contain symbolic links: " + relative(root, path) + ".");
      if (entry.isDirectory()) await inspect(path, await readdir(path, { withFileTypes: true }));
      else if (!entry.isFile()) throw new OruError("Unsupported asset entry: " + relative(root, path) + ".");
    }
  };
  await inspect(assetRoot, entries);
}

async function validateWidgetAssets(widget: ReturnType<typeof parsePage>["widgets"][number], root: string): Promise<void> {
  const sources: string[] = [];
  if (widget.type === "image") sources.push(String(widget.properties.src ?? ""));
  if (widget.type === "button" && widget.properties.icon) sources.push(String(widget.properties.icon));
  for (const source of sources) {
    if (/^https:\/\//i.test(source)) {
      let url: URL;
      try { url = new URL(source); } catch { throw new OruError("Invalid remote image URL.", widget.line); }
      if (url.username || url.password) throw new OruError("Remote image URLs cannot contain credentials.", widget.line);
    } else {
      if (!source.startsWith("assets/") || source.includes("\\") || source.split("/").some(part => !part || part === "." || part === "..")) {
        throw new OruError('Image sources must be inside assets/ or use an HTTPS URL: "' + source + '".', widget.line);
      }
      const path = resolve(root, source);
      const assetRoot = resolve(root, "assets");
      if (!path.startsWith(assetRoot + sep)) throw new OruError("Image source leaves the assets directory.", widget.line);
      let info: Stats;
      try { info = await lstat(path); } catch { throw new OruError("Image asset was not found: " + source + ".", widget.line); }
      if (!info.isFile()) throw new OruError("Image asset must be a regular file: " + source + ".", widget.line);
    }
  }
  for (const child of widget.children) await validateWidgetAssets(child, root);
}

type LogicDeclaration = { source: string; exportable: boolean };

function logicDeclarations(logic: string): Map<string, LogicDeclaration> {
  const lines = logic.split("\n");
  const declarations = new Map<string, LogicDeclaration>();
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    if (indent !== 0) continue;
    const functionMatch = line.match(/^func\s+([A-Za-z_]\w*)\s*\(/);
    const stateMatch = line.match(/^(?:state|global)\s+([A-Za-z_]\w*)\s*=/);
    const valueMatch = line.match(/^([A-Za-z_]\w*)\s*=\s*.+$/);
    const name = functionMatch?.[1] ?? stateMatch?.[1] ?? valueMatch?.[1];
    if (!name) continue;
    const start = index;
    if (functionMatch) {
      while (index + 1 < lines.length) {
        const next = lines[index + 1]!;
        if (next.trim() && next.length - next.trimStart().length === 0) break;
        index++;
      }
    }
    declarations.set(name, {
      source: lines.slice(start, index + 1).join("\n"),
      exportable: Boolean(functionMatch || valueMatch)
    });
  }
  return declarations;
}

export interface CompileProjectOptions { includeRuntime?: boolean }

export async function compileProject(projectDirectory = ".", options: CompileProjectOptions = {}): Promise<Map<string, string>> {
  const root = resolve(projectDirectory);
  await validateConfig(root);
  const sources = (await findPages(root)).sort();
  const routeTable = buildRouteTable(sources);
  const parsed = new Map<string, ReturnType<typeof parsePage>>();
  for (const source of sources) {
    parsed.set(source, parsePage(await readFile(join(root, source), "utf8"), source));
  }
  await validateAssetTree(root);
  for (const page of parsed.values()) for (const widget of page.widgets) await validateWidgetAssets(widget, root);
  const routeMap: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const page of routeTable.values()) {
    routeMap[page.source.slice(0, -4)] = page.route;
  }

  const resolving = new Set<string>();
  const resolved = new Map<string, ReturnType<typeof parsePage>>();
  const resolvePage = (source: string): ReturnType<typeof parsePage> => {
    const cached = resolved.get(source);
    if (cached) return cached;
    if (resolving.has(source)) throw new OruError("Circular ORU module import detected at " + source + ".");
    const page = parsed.get(source);
    if (!page) throw new OruError("Imported ORU module was not found: " + source + ".");
    resolving.add(source);
    const classes = { ...page.classes };
    const importedLogic: string[] = [];
    const localDeclarations = logicDeclarations(page.logic);
    const importedNames = new Set<string>();
    for (const item of page.imports) {
      const modulePath = item.module.replaceAll(".", "/") + ".oru";
      const target = normalize(join(dirname(source), modulePath)).split(sep).join("/");
      if (target === ".." || target.startsWith("../")) throw new OruError("Import path leaves the project: " + item.module + ".");
      const modulePage = resolvePage(target);
      if (item.kind === "named") {
        const exports = logicDeclarations(modulePage.logic);
        for (const name of item.names) {
          const styles = modulePage.classes[name];
          const declaration = exports.get(name);
          if (styles && declaration) throw new OruError("Import name is ambiguous between a style class and logic export: " + name + ".");
          if (styles) {
            if (classes[name]) throw new OruError("Imported style class conflicts with local class: " + name + ".");
            classes[name] = styles;
            continue;
          }
          if (!declaration || !declaration.exportable) {
            throw new OruError("Name " + name + " was not exported by " + item.module + ". Import only top-level functions and plain values.");
          }
          if (localDeclarations.has(name) || importedNames.has(name)) {
            throw new OruError("Imported logic name conflicts with an existing declaration: " + name + ".");
          }
          importedNames.add(name);
          importedLogic.push(declaration.source);
        }
      } else {
        for (const [name, styles] of Object.entries(modulePage.classes)) {
          const qualified = item.alias + "." + name;
          if (classes[qualified]) throw new OruError("Imported style class conflicts with existing class: " + qualified + ".");
          classes[qualified] = styles;
        }
      }
    }
    resolving.delete(source);
    const logic = [...importedLogic, page.logic].filter(part => part.trim()).join("\n");
    const result = { ...page, classes, logic, imports: [] };
    resolved.set(source, result);
    return result;
  };

  const output = new Map<string, string>();
  for (const pageRoute of routeTable.values()) {
    const page = resolvePage(pageRoute.source);
    output.set(pageRoute.output, compilePage(page, pageRoute, routeMap));
  }
  if (options.includeRuntime !== false && [...parsed.values()].some(page => page.logic.trim().length > 0)) {
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
