import { OruError, type OruDocument, type OruNode, type StyleMap } from "./ast.js";
import { parse } from "./parser.js";

const voidTags = new Set(["img", "input", "hr"]);
const properties: Record<string, Record<string, string>> = {
  section: { background: "background-color", padding: "padding", radius: "border-radius", width: "width", height: "min-height", align: "text-align", gap: "gap" },
  box: { background: "background-color", padding: "padding", radius: "border-radius", width: "width", height: "height", gap: "gap", shadow: "box-shadow", align: "text-align" },
  stack: { gap: "gap", align: "align-items", justify: "justify-content", padding: "padding", width: "width" },
  grid: { columns: "grid-template-columns", gap: "gap", align: "align-items", padding: "padding" },
  text: { color: "color", size: "font-size", weight: "font-weight", font: "font-family", line: "line-height", align: "text-align", space: "letter-spacing" },
  heading: { color: "color", size: "font-size", weight: "font-weight", font: "font-family", line: "line-height", align: "text-align" },
  button: { color: "color", background: "background-color", size: "font-size", weight: "font-weight", radius: "border-radius", padding: "padding", width: "width" },
  link: { color: "color", size: "font-size", weight: "font-weight", decoration: "text-decoration" },
  image: { width: "width", height: "height", fit: "object-fit", radius: "border-radius" },
  input: { color: "color", background: "background-color", size: "font-size", radius: "border-radius", padding: "padding", width: "width" },
  form: { gap: "gap", width: "width", padding: "padding" },
  video: { width: "width", radius: "border-radius", fit: "object-fit" },
  list: { color: "color", gap: "gap", size: "font-size" },
  item: { color: "color", size: "font-size" },
  class: { background: "background-color", padding: "padding", radius: "border-radius", width: "width", gap: "gap", align: "text-align" }
};
const safeCss = new Set([
  "background-color", "color", "font-size", "font-family", "font-weight", "line-height",
  "text-align", "text-decoration", "letter-spacing", "width", "height", "min-height",
  "max-width", "margin", "padding", "border-radius", "display", "gap", "align-items",
  "justify-content", "grid-template-columns", "box-shadow", "object-fit"
]);

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function toCss(styles: StyleMap, scope: string): string {
  return Object.entries(styles).flatMap(([key, value]) => {
    const [keyScope, property] = key.split(".");
    if (keyScope !== scope || !property) return [];
    const cssProperty = properties[scope]?.[property];
    if (!cssProperty || !safeCss.has(cssProperty)) {
      throw new OruError(`Unknown ${scope} style "${property}".`);
    }
    let cssValue = value.trim();
    if (property === "size" && /^\d+(?:\.\d+)?$/.test(cssValue)) {
      const max = Number(cssValue);
      cssValue = `clamp(1rem, ${Math.min(8, Math.max(2, max / 10))}vw, ${max}px)`;
    }
    if (scope === "grid" && property === "columns" && /^\d+$/.test(cssValue)) {
      cssValue = `repeat(auto-fit, minmax(min(100%, ${Math.max(140, 1100 / Number(cssValue))}px), 1fr))`;
    }
    return [`${cssProperty}:${cssValue}`];
  }).join(";");
}

function renderNode(node: OruNode, classes: Map<string, OruNode>): string {
  if (node.kind === "page") return node.children.map(child => renderNode(child, classes)).join("\n");
  const className = node.styles["oru.class"];
  const classDefinition = className ? classes.get(className) : undefined;
  const styles = { ...(classDefinition?.styles ?? {}), ...node.styles };
  const tag = node.tag ?? "div";
  const attrs: string[] = [];
  const classStyle = classDefinition ? toCss(classDefinition.styles, "class") : "";
  const ownStyle = toCss(styles, node.name);
  const style = [classStyle, ownStyle].filter(Boolean).join(";");
  if (style) attrs.push(`style="${escapeHtml(style)}"`);
  if (node.name === "stack") attrs.push('class="oru-stack"');
  if (node.name === "grid") attrs.push('class="oru-grid"');
  if (node.name === "image") attrs.push(`src="${escapeHtml(styles["oru.src"] ?? "")}"`, `alt="${escapeHtml(node.text ?? "")}"`, 'loading="lazy"');
  if (node.name === "video") attrs.push(`src="${escapeHtml(styles["oru.src"] ?? "")}"`, "controls", "playsinline");
  if (node.name === "link") attrs.push(`href="${escapeHtml(styles["oru.href"] ?? "#")}"`);
  if (node.name === "button") {
    attrs.push('type="button"');
    if (styles["oru.action"]) attrs.push(`data-oru-action="${escapeHtml(styles["oru.action"])}"`);
  }
  if (node.name === "form") attrs.push(`action="${escapeHtml(styles["oru.action"] ?? "#")}"`, 'method="post"');
  if (node.name === "input") attrs.push(`placeholder="${escapeHtml(styles["oru.placeholder"] ?? "")}"`);
  if (node.name === "divider") attrs.push('aria-hidden="true"');
  const content = [
    ["link", "button", "text", "heading", "item"].includes(node.name) ? escapeHtml(node.text ?? "") : "",
    node.children.map(child => renderNode(child, classes)).join("\n")
  ].filter(Boolean).join("\n");
  if (voidTags.has(tag)) return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`;
  return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>${content}</${tag}>`;
}

function renderPage(document: OruDocument, page: OruNode): string {
  const body = renderNode(page, document.classes);
  const pageTitle = page.name === "index" ? document.title : `${page.name} | ${document.title}`;
  const fontFace = document.font ? `@font-face{font-family:ORUCustom;src:url("${escapeHtml(document.font)}")}\n` : "";
  const css = `
    :root{font-family:ORUCustom,system-ui,sans-serif;color:#171717;background:${escapeHtml(document.styles.background ?? "#ffffff")};font-synthesis:none;text-rendering:optimizeLegibility}
    *{box-sizing:border-box}
    html{width:100%;scroll-behavior:smooth}
    body{margin:0;min-width:0;min-height:100vh;overflow-x:hidden}
    img,video{display:block;max-width:100%;height:auto}
    button,input{font:inherit;max-width:100%}
    button{min-height:44px;touch-action:manipulation;cursor:pointer}
    input{min-height:44px;min-width:0}
    p,h1,h2,h3,h4,h5,h6{overflow-wrap:anywhere}
    .oru-stack{display:flex;flex-direction:column;gap:1rem;min-width:0}
    .oru-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:1rem;min-width:0}
    section{min-width:0;max-width:100%}
    @media(max-width:640px){
      body{font-size:16px}
      section{padding-left:min(5vw,24px);padding-right:min(5vw,24px)}
      .oru-grid{grid-template-columns:minmax(0,1fr)}
      .oru-stack{gap:clamp(.65rem,3vw,1rem)}
      img,video{height:auto}
    }
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
  `;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(document.description)}">
<meta name="theme-color" content="${escapeHtml(document.styles.background ?? "#ffffff")}">
<title>${escapeHtml(pageTitle)}</title>
<style>${fontFace}${css}</style>
</head>
<body>
${body}
<script>
document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("[data-oru-action]");
  if (!button) return;
  const action = button.getAttribute("data-oru-action") || "";
  if (action.startsWith("go ")) location.href = action.slice(3);
});
</script>
</body>
</html>`;
}

export interface CompileResult { files: Map<string, string> }

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
