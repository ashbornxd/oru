import { OruError, type OruDocument, type OruNode } from "./ast.js";

interface StackEntry { indent: number; node: OruNode }

const elementTags: Record<string, string> = {
  section: "section", box: "div", stack: "div", grid: "div",
  nav: "nav", heading: "h1", text: "p", image: "img",
  button: "button", link: "a", input: "input", form: "form",
  video: "video", divider: "hr", list: "ul", item: "li"
};

const styleScopes = new Set([
  "section", "box", "stack", "grid", "nav", "heading", "text",
  "image", "button", "link", "input", "form", "video", "list", "item", "class"
]);

function unquote(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\n/g, "\n").replace(/\\t/g, "\t")
      .replace(/\\(["'])/g, "$1");
  }
  return trimmed;
}

function readArguments(value: string): string[] {
  const args: string[] = [];
  let current = "", quote = "", depth = 0;
  for (const char of value) {
    if ((char === '"' || char === "'") && !quote) quote = char;
    else if (char === quote) quote = "";
    if (char === "," && !quote && depth === 0) {
      args.push(unquote(current)); current = "";
    } else {
      current += char;
      if (char === "(" && !quote) depth++;
      if (char === ")" && !quote) depth--;
    }
  }
  if (current.trim()) args.push(unquote(current));
  return args;
}

function makeNode(kind: OruNode["kind"], name: string, line: number, tag?: string, text?: string): OruNode {
  return { kind, name, line, tag, text, styles: {}, children: [] };
}

export function parse(source: string): OruDocument {
  const document: OruDocument = {
    title: "ORU Website", description: "", styles: {}, pages: [], classes: new Map()
  };
  const stack: StackEntry[] = [];
  let activePage: OruNode | undefined;
  let activeClass: OruNode | undefined;
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? "";
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    if (raw.includes("\t")) throw new OruError("Use spaces for indentation, not tabs.", index + 1);
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    while (stack.length && indent <= stack[stack.length - 1]!.indent) stack.pop();
    const parent = stack[stack.length - 1]?.node;

    const assignment = line.match(/^([a-zA-Z_][\w.]*)\s*=\s*(.+)$/);
    if (assignment) {
      const key = assignment[1]!;
      const value = unquote(assignment[2]!);
      if (!parent) {
        if (activePage || activeClass) throw new OruError("Project settings must be at the top of the file.", index + 1);
        if (key === "title") document.title = value;
        else if (key === "description") document.description = value;
        else if (key === "font") document.font = value;
        else if (key === "background") document.styles.background = value;
        else throw new OruError(`Unknown project setting "${key}".`, index + 1);
      } else {
        const [scope, property, extra] = key.split(".");
        if (!property || extra || (scope !== parent.name && !(parent.kind === "class" && scope === "class"))) {
          throw new OruError(`Use ${parent.name}.property for styles inside this element.`, index + 1);
        }
        if (!styleScopes.has(scope!)) throw new OruError(`Unknown style scope "${scope}".`, index + 1);
        parent.styles[key] = value;
      }
      continue;
    }

    const pageMatch = line.match(/^page\s+([\w-]+)\s*:\s*$/);
    if (pageMatch) {
      const node = makeNode("page", pageMatch[1]!, index + 1);
      document.pages.push(node); activePage = node; activeClass = undefined;
      stack.push({ indent, node }); continue;
    }

    const classMatch = line.match(/^class\s+([A-Za-z_]\w*)\s*:\s*$/);
    if (classMatch) {
      const name = classMatch[1]!;
      if (document.classes.has(name)) throw new OruError(`Class "${name}" is already defined.`, index + 1);
      const node = makeNode("class", name, index + 1);
      document.classes.set(name, node); activeClass = node; activePage = undefined;
      stack.push({ indent, node }); continue;
    }

    if (!activePage) throw new OruError("Add a page before defining page content.", index + 1);

    const classUse = line.match(/^([A-Za-z_]\w*)\s*:\s*$/);
    if (classUse && document.classes.has(classUse[1]!)) {
      const node = makeNode("element", classUse[1]!, index + 1, "div");
      node.styles["oru.class"] = classUse[1]!;
      (parent ?? activePage).children.push(node);
      stack.push({ indent, node }); continue;
    }

    const elementMatch = line.match(/^([a-zA-Z]+)\s*(?:\((.*)\))?\s*(:)?\s*$/);
    if (!elementMatch) throw new OruError(`I don't understand "${line}". Check the syntax.`, index + 1);
    const name = elementMatch[1]!.toLowerCase();
    const tag = elementTags[name];
    if (!tag) throw new OruError(`Unknown element "${name}".`, index + 1);
    const args = readArguments(elementMatch[2] ?? "");
    const node = makeNode("element", name, index + 1, tag, name === "image" ? args[1] : args[0]);
    if (name === "image") node.styles["oru.src"] = args[0] ?? "";
    if (name === "link") node.styles["oru.href"] = args[1] ?? "#";
    if (name === "button" && args[1]) node.styles["oru.action"] = args[1];
    if (name === "input" && args[0]) node.styles["oru.placeholder"] = args[0];
    if (name === "video") node.styles["oru.src"] = args[0] ?? "";
    if (name === "form" && args[0]) node.styles["oru.action"] = args[0];
    (parent ?? activePage).children.push(node);
    if (elementMatch[3]) stack.push({ indent, node });
  }

  if (document.pages.length === 0) throw new OruError("Your project needs at least one page.");
  for (const node of document.classes.values()) {
    if (node.children.length === 0 && Object.keys(node.styles).length === 0) {
      throw new OruError(`Class "${node.name}" is empty.`, node.line);
    }
  }
  return document;
}
