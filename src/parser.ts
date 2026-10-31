import { OruError, type OruDocument, type OruNode, type StyleMap } from "./ast.js";

interface StackEntry {
  indent: number;
  node: OruNode;
}

const elementTags: Record<string, string> = {
  section: "section",
  container: "div",
  row: "div",
  column: "div",
  nav: "nav",
  header: "header",
  footer: "footer",
  main: "main",
  heading: "h1",
  text: "p",
  image: "img",
  button: "button",
  link: "a",
  input: "input",
  divider: "hr",
  list: "ul",
  item: "li"
};

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\(["'])/g, "$1");
  }
  return trimmed;
}

function readArguments(value: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote = "";
  for (const char of value) {
    if ((char === '"' || char === "'") && !quote) quote = char;
    else if (char === quote) quote = "";
    if (char === "," && !quote) {
      result.push(unquote(current));
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) result.push(unquote(current));
  return result;
}

function makeNode(
  kind: OruNode["kind"],
  name: string,
  line: number,
  tag?: string,
  text?: string
): OruNode {
  return { kind, name, line, tag, text, styles: {}, children: [] };
}

export function parse(source: string): OruDocument {
  const document: OruDocument = {
    title: "ORU Website",
    description: "",
    styles: {},
    pages: [],
    classes: new Map()
  };

  const stack: StackEntry[] = [];
  let activePage: OruNode | undefined;
  let activeClass: OruNode | undefined;
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
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
        if (key === "title") document.title = value;
        else if (key === "description") document.description = value;
        else if (key === "font") document.font = value;
        else if (key === "background") document.styles["background-color"] = value;
        else throw new OruError(`Unknown project setting "${key}".`, index + 1);
      } else {
        const normalized = key === "text.size" ? "font-size"
          : key === "text.color" ? "color"
          : key === "text.font" ? "font-family"
          : key.includes(".") ? key.replace(/^text\./, "").replaceAll(".", "-")
          : key;
        parent.styles[normalized] = value;
      }
      continue;
    }

    const pageMatch = line.match(/^page\s+([\w-]+)\s*:\s*$/);
    if (pageMatch) {
      const node = makeNode("page", pageMatch[1]!, index + 1);
      document.pages.push(node);
      activePage = node;
      activeClass = undefined;
      stack.push({ indent, node });
      continue;
    }

    const classMatch = line.match(/^class\s+([A-Za-z_]\w*)\s*:\s*$/);
    if (classMatch) {
      const name = classMatch[1]!;
      if (document.classes.has(name)) throw new OruError(`Class "${name}" is already defined.`, index + 1);
      const node = makeNode("class", name, index + 1);
      document.classes.set(name, node);
      activeClass = node;
      activePage = undefined;
      stack.push({ indent, node });
      continue;
    }

    if (!activePage) {
      throw new OruError("Add a page before defining page content.", index + 1);
    }

    const classUse = line.match(/^([A-Za-z_]\w*)\s*:\s*$/);
    if (classUse && document.classes.has(classUse[1]!)) {
      const node = makeNode("element", classUse[1]!, index + 1, "div");
      node.styles["--oru-class"] = classUse[1]!;
      (parent ?? activePage).children.push(node);
      stack.push({ indent, node });
      continue;
    }

    const elementMatch = line.match(/^([a-zA-Z]+)\s*(?:\((.*)\))?\s*:\s*$/);
    if (!elementMatch) {
      throw new OruError(`I don't understand "${line}". Check the syntax.`, index + 1);
    }

    const name = elementMatch[1]!.toLowerCase();
    const tag = elementTags[name];
    if (!tag) throw new OruError(`Unknown element "${name}".`, index + 1);
    const args = readArguments(elementMatch[2] ?? "");
    const node = makeNode("element", name, index + 1, tag, args[0]);
    if (name === "image") node.styles["--oru-src"] = args[0] ?? "";
    if (name === "link") node.styles["--oru-href"] = args[1] ?? "#";
    if (name === "button" && args[1]) node.styles["--oru-action"] = args[1];
    if (name === "input" && args[0]) node.styles["--oru-placeholder"] = args[0];
    if (name === "row") node.styles["--oru-layout"] = "row";
    if (name === "column") node.styles["--oru-layout"] = "column";
    (parent ?? activePage).children.push(node);
    if (line.endsWith(":")) stack.push({ indent, node });
  }

  if (document.pages.length === 0) throw new OruError("Your project needs at least one page.");
  if (activeClass && activeClass.children.length === 0 && Object.keys(activeClass.styles).length === 0) {
    throw new OruError(`Class "${activeClass.name}" is empty.`, activeClass.line);
  }
  return document;
}
