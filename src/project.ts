import { OruError } from "./ast.js";

export type PageValue = string | number | boolean;
export interface PageWidget {
  type: "column" | "row" | "box" | "form" | "text" | "button" | "link" | "image" | "input";
  text?: string;
  route?: string;
  binding?: string;
  properties: Record<string, PageValue>;
  children: PageWidget[];
  line: number;
}
export interface PageImport { kind: "namespace" | "named"; module: string; names: string[]; alias?: string }
export interface OruPage {
  metadata: { title: string; description: string; language: string };
  classes: Record<string, Record<string, PageValue>>;
  imports: PageImport[];
  widgets: PageWidget[];
  logic: string;
  sourcePath?: string;
}
type Line = { indent: number; text: string; number: number };
const widgetTypes = new Set<PageWidget["type"]>(["column", "row", "box", "form", "text", "button", "link", "image", "input"]);

function linesOf(source: string): Line[] {
  const lines: Line[] = [];
  let comment = false;
  source.replace(/\r\n?/g, "\n").split("\n").forEach((raw, index) => {
    let text = raw;
    if (comment) {
      const end = text.indexOf('"""');
      if (end < 0) return;
      text = text.slice(end + 3);
      comment = false;
    }
    while (true) {
      const start = text.indexOf('"""');
      if (start < 0) break;
      const end = text.indexOf('"""', start + 3);
      if (end >= 0) text = text.slice(0, start) + text.slice(end + 3);
      else { text = text.slice(0, start); comment = true; break; }
    }
    if (!text.trim() || text.trimStart().startsWith("#")) return;
    if (text.includes("\t")) throw new OruError("Use spaces for indentation, not tabs.", index + 1);
    const indent = text.length - text.trimStart().length;
    if (indent % 4 !== 0) throw new OruError("Indentation must use four-space levels.", index + 1);
    lines.push({ indent, text: text.trim(), number: index + 1 });
  });
  if (comment) throw new OruError("Unclosed triple-quoted comment.");
  return lines;
}

function valueOf(raw: string, line: number): PageValue {
  const value = raw.trim();
  if (!value) throw new OruError("Expected a property value.", line);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    const quote = value[0]!;
    return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\t/g, "\t")
      .replace(new RegExp("\\\\" + quote, "g"), quote).replace(/\\\\/g, "\\");
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  // Colors, CSS units, and expression placeholders remain strings for the renderer.
  return value;
}

function widgetOf(text: string, line: number): PageWidget | null {
  const match = text.match(/^(?:(?:[A-Za-z_][A-Za-z0-9_]*)\s+)?([A-Za-z]+)(?:\((.*)\))?\s*:?\s*$/);
  if (!match) return null;
  const type = match[1]!.toLowerCase();
  if (!widgetTypes.has(type as PageWidget["type"])) throw new OruError("Unknown widget: " + type, line);
  const args = match[2]?.trim() ?? "";
  let label: string | undefined;
  let route: string | undefined;
  let binding: string | undefined;
  const properties: Record<string, PageValue> = {};
  const values = [...args.matchAll(/"([^"]*)"|'([^']*)'/g)].map(item => item[1] ?? item[2] ?? "");
  if (type === "link") {
    label = values[0];
    route = values[1] ?? values[0];
  } else if (type === "image") {
    properties.src = values[0] ?? "";
    label = values[1] ?? "";
  } else if (type === "input" && values.length === 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(args)) {
    binding = args;
  } else if (type === "input") {
    properties.placeholder = values[0] ?? "";
  } else if ((type === "text" || type === "button") && values.length === 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(args)) {
    binding = args;
  } else {
    label = values[0];
  }
  return { type: type as PageWidget["type"], text: label, route, binding, properties, children: [], line };
}
export function parsePage(source: string, sourcePath?: string): OruPage {
  const lines = linesOf(source);
  const metadata = { title: "Untitled", description: "", language: "en" };
  const widgets: PageWidget[] = [];
  const stack: Array<{ indent: number; widget: PageWidget }> = [];
  let section: "metadata" | "class" | "logic" | "page" | null = null;
  let sawPage = false;
  let sawMetadata = false;
  let sawClass = false;
  let activeClass = "";
  let sawLogic = false;
  const classes: Record<string, Record<string, PageValue>> = {};
  const imports: PageImport[] = [];
  const logicLines: string[] = [];

  for (const line of lines) {
    while (stack.length && line.indent <= stack[stack.length - 1]!.indent) stack.pop();
    if (line.indent === 0 && line.text === "metadata:") {
      if (sawMetadata || sawClass || sawLogic || sawPage) throw new OruError("metadata must appear once before classes, logic, and page.", line.number);
      sawMetadata = true; section = "metadata"; continue;
    }
    if (line.indent === 0 && (sawLogic || sawPage) && (line.text.startsWith("import ") || line.text.startsWith("from "))) {
      throw new OruError("Imports must appear before logic and page.", line.number);
    }
    const fromImport = line.indent === 0 ? line.text.match(/^from\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s+import\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)$/) : null;
    if (fromImport) {
      imports.push({ kind: "named", module: fromImport[1]!, names: fromImport[2]!.split(",").map(name => name.trim()) });
      continue;
    }
    const namespaceImport = line.indent === 0 ? line.text.match(/^import\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)$/) : null;
    if (namespaceImport) {
      const modulePath = namespaceImport[1]!;
      const alias = modulePath.split(".").at(-1)!;
      imports.push({ kind: "namespace", module: modulePath, names: [], alias });
      continue;
    }
    const classHeader = line.indent === 0 ? line.text.match(/^class\s+([A-Za-z_]\w*)\s*:\s*$/) : null;
    if (classHeader) {
      if (sawLogic || sawPage) throw new OruError("Style classes must be declared before logic and page.", line.number);
      activeClass = classHeader[1]!;
      if (classes[activeClass]) throw new OruError("Style class already exists: " + activeClass, line.number);
      classes[activeClass] = {};
      sawClass = true; section = "class"; continue;
    }
    if (line.indent === 0 && line.text === "logic:") {
      if (sawLogic || sawPage) throw new OruError("logic must appear once before page.", line.number);
      sawLogic = true; section = "logic"; continue;
    }
    if (line.indent === 0 && line.text === "page:") {
      if (sawPage) throw new OruError("A .oru file can define exactly one page.", line.number);
      sawPage = true; section = "page"; continue;
    }
    if (!section) throw new OruError("Start the file with metadata:, a class declaration, logic:, or page:.", line.number);
    if (section === "class") {
      if (line.indent !== 4) throw new OruError("Style class properties must be indented once.", line.number);
      const field = line.text.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
      if (!field) throw new OruError("Expected a style property in the form name: value.", line.number);
      const key = field[1]!;
      if (key in classes[activeClass]!) throw new OruError("Style property is defined twice: " + key, line.number);
      classes[activeClass]![key] = valueOf(field[2]!, line.number);
      continue;
    }
    if (section === "logic") {
      if (line.indent < 4) throw new OruError("Logic statements must be indented once under logic:.", line.number);
      logicLines.push(" ".repeat(line.indent - 4) + line.text);
      continue;
    }
    if (section === "metadata") {
      if (line.indent !== 4) throw new OruError("Metadata fields must be indented once.", line.number);
      const field = line.text.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
      if (!field) throw new OruError("Expected a metadata field in the form name: value.", line.number);
      const key = field[1]!;
      if (!(key in metadata)) throw new OruError('Unknown metadata field "' + key + '".', line.number);
      metadata[key as keyof typeof metadata] = String(valueOf(field[2]!, line.number));
      continue;
    }
    if (line.indent < 4) throw new OruError("Page widgets must be nested under page:.", line.number);
    const parent = stack[stack.length - 1]?.widget;
    const property = line.text.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*:\s*(.+)$/);
    const widget = widgetOf(line.text, line.number);
    if (property && parent && line.indent === stack[stack.length - 1]!.indent + 4 && !widget) {
      const key = property[1]!;
      if (key in parent.properties) throw new OruError('Property "' + key + '" is defined twice.', line.number);
      parent.properties[key] = valueOf(property[2]!, line.number);
      continue;
    }
    if (!widget) throw new OruError('I do not understand "' + line.text + '".', line.number);
    const expectedIndent = parent ? stack[stack.length - 1]!.indent + 4 : 4;
    if (line.indent !== expectedIndent) throw new OruError("Widget indentation must increase by four spaces.", line.number);
    (parent ? parent.children : widgets).push(widget);
    stack.push({ indent: line.indent, widget });
  }
  if (!sawPage) throw new OruError("Every .oru file must contain a page: block.");
  if (widgets.length === 0) throw new OruError("A page must contain at least one widget.");
  for (const [name, properties] of Object.entries(classes)) {
    if (Object.keys(properties).length === 0) throw new OruError("Style class is empty: " + name);
  }
  return { metadata, classes, imports, widgets, logic: logicLines.join("\n"), sourcePath };
}
