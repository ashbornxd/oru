import { OruError, type OruDocument, type OruNode, type StyleMap } from "./ast.js";
import { parse } from "./parser.js";

const voidTags = new Set(["img", "input", "hr"]);
const allowedStyle = new Set([
  "background", "background-color", "color", "font-size", "font-family",
  "font-weight", "font-style", "text-align", "text-decoration", "line-height",
  "letter-spacing", "width", "height", "min-width", "max-width", "min-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border", "border-radius", "display", "gap", "align-items", "justify-content",
  "flex-wrap", "flex", "grid-template-columns", "box-shadow", "opacity",
  "object-fit", "position", "top", "right", "bottom", "left", "cursor"
]);

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function cssValue(value: string): string {
  return value.trim();
}

function stylesToCss(styles: StyleMap): string {
  return Object.entries(styles)
    .filter(([key]) => allowedStyle.has(key))
    .map(([key, value]) => `${key}:${cssValue(value)}`)
    .join(";");
}

function renderNode(node: OruNode, classes: Map<string, OruNode>): string {
  if (node.kind === "page") return node.children.map(child => renderNode(child, classes)).join("\n");
  const className = node.styles["--oru-class"];
  const classDefinition = className ? classes.get(className) : undefined;
  const styles = { ...(classDefinition?.styles ?? {}), ...node.styles };
  delete styles["--oru-class"];
  const tag = node.tag ?? "div";
  const attrs: string[] = [];
  const style = stylesToCss(styles);
  if (style) attrs.push(`style="${escapeHtml(style)}"`);
  if (node.name === "image") {
    const src = styles["--oru-src"] ?? "";
    attrs.push(`src="${escapeHtml(src)}"`, `alt="${escapeHtml(node.text ?? "")}"`, 'loading="lazy"');
  }
  if (node.name === "link") attrs.push(`href="${escapeHtml(styles["--oru-href"] ?? "#")}"`);
  if (node.name === "button") {
    attrs.push('type="button"');
    if (styles["--oru-action"]) attrs.push(`data-oru-action="${escapeHtml(styles["--oru-action"])}"`);
  }
  if (node.name === "input") attrs.push(`placeholder="${escapeHtml(styles["--oru-placeholder"] ?? "")}"`);
  if (node.name === "row" || node.name === "column") {
    attrs.push(`class="oru-${node.name}"`);
  }
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  const content = [
    node.name === "link" || node.name === "button" || node.name === "text" || node.name === "heading" || node.name === "item"
      ? escapeHtml(node.text ?? "")
      : "",
    node.children.map(child => renderNode(child, classes)).join("\n")
  ].filter(Boolean).join("\n");
  if (voidTags.has(tag)) return `<${tag}${attrText}>`;
  return `<${tag}${attrText}>${content}</${tag}>`;
}

function renderPage(document: OruDocument, page: OruNode): string {
  const body = renderNode(page, document.classes);
  const pageTitle = page.name === "index" ? document.title : `${page.name} | ${document.title}`;
  const fontFace = document.font
    ? `@font-face{font-family:ORUCustom;src:url("${escapeHtml(document.font)}")}\n`
    : "";
  const globalStyles = stylesToCss(document.styles);
  const css = `
    :root{font-family:ORUCustom,Arial,sans-serif;color:#171717;background:#fff}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;${globalStyles}}
    img{max-width:100%;height:auto}
    button,input{font:inherit}
    .oru-row{display:flex;flex-direction:row;align-items:center;gap:1rem;flex-wrap:wrap}
    .oru-column{display:flex;flex-direction:column;gap:1rem}
    @media(max-width:640px){.oru-row{align-items:stretch}}
  `;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(document.description)}">
  <title>${escapeHtml(pageTitle)}</title>
  <style>${fontFace}${css}</style>
</head>
<body>
${body}
<script>
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-oru-action]");
    if (!button) return;
    const action = button.getAttribute("data-oru-action");
    if (action && action.startsWith("go ")) location.href = action.slice(3);
  });
</script>
</body>
</html>`;
}

export interface CompileResult {
  files: Map<string, string>;
}

export function compile(source: string): CompileResult {
  const document = parse(source);
  const files = new Map<string, string>();
  for (const page of document.pages) {
    const filename = page.name === "index" ? "index.html" : `${page.name}.html`;
    if (files.has(filename)) throw new OruError(`Page "${page.name}" is defined more than once.`, page.line);
    files.set(filename, renderPage(document, page));
  }
  return { files };
}
