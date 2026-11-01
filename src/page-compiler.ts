import { OruError } from "./ast.js";
import type { OruPage, PageWidget } from "./project.js";
import type { PageRoute } from "./routes.js";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const classProperties: Record<PageWidget["type"], Set<string>> = {
  column: new Set(["background", "padding", "gap", "width", "height"]),
  row: new Set(["background", "padding", "gap", "width", "height"]),
  box: new Set(["background", "padding", "radius", "width", "height", "gap"]),
  form: new Set(["background", "padding", "radius", "width", "height", "gap"]),
  text: new Set(["color", "size", "weight", "font", "line", "align"]),
  button: new Set(["color", "background", "size", "weight", "radius", "padding", "width", "disabled"]),
  link: new Set(["color", "size", "weight", "decoration"]),
  image: new Set(["width", "height", "fit", "radius"]),
  input: new Set(["color", "background", "size", "radius", "padding", "width", "height", "type", "required", "disabled", "readOnly", "min", "max", "step", "minLength", "maxLength", "pattern", "autocomplete", "constraint", "name"])
};

function resolveWidget(widget: PageWidget, classes: OruPage["classes"]): PageWidget {
  let properties = { ...widget.properties };
  const className = properties.class;
  if (className !== undefined) {
    if (typeof className !== "string" || !classes[className]) throw new OruError("Unknown style class: " + String(className), widget.line);
    const styles = classes[className]!;
    for (const key of Object.keys(styles)) {
      if (!classProperties[widget.type].has(key)) throw new OruError("Style class property " + key + " is not supported by " + widget.type + ".", widget.line);
    }
    properties = { ...styles, ...properties };
    delete properties.class;
  }
  return { ...widget, properties, children: widget.children.map(child => resolveWidget(child, classes)) };
}
function validateLinks(widget: PageWidget, routes: Record<string, string>): void {
  if (widget.type === "link") {
    const route = String(widget.route ?? widget.properties.route ?? "");
    if (!Object.prototype.hasOwnProperty.call(routes, route)) throw new OruError("Unknown internal route: " + route, widget.line);
  }
  for (const child of widget.children) validateLinks(child, routes);
}
function validateForms(widget: PageWidget, functions: Set<string>, insideForm = false): void {
  if (widget.type === "form") {
    if (insideForm) throw new OruError("Forms cannot be nested.", widget.line);
    const handler = widget.properties["on.submit"];
    if (typeof handler !== "string" || !functions.has(handler)) {
      throw new OruError("A form requires on.submit: name referencing a function in logic:.", widget.line);
    }
  }
  if (insideForm && widget.type === "button" && widget.properties["on.click"] !== undefined) {
    throw new OruError("Buttons inside a form submit the form; use on.submit on the form instead.", widget.line);
  }
  for (const child of widget.children) validateForms(child, functions, insideForm || widget.type === "form");
}
function validateBindings(widget: PageWidget, declared: Set<string>, globals: Set<string>): void {
  if (widget.binding && !declared.has(widget.binding)) throw new OruError("Bound widget variable must be declared with state or global: " + widget.binding, widget.line);
  if (widget.type === "input" && widget.properties.type === "password" && widget.binding && globals.has(widget.binding)) throw new OruError("Password inputs must use page-local state.", widget.line);
  for (const child of widget.children) validateBindings(child, declared, globals);
}

function runtimeSource(page: OruPage, routes: Record<string, string>, corePath: string): string {
  const payload = JSON.stringify({ page, routes, logic: page.logic }).replace(/</g, "\\u003c");
  return `
${page.logic.trim() ? `import { run } from "${corePath}";` : ""}
(() => {
  const data = ${payload};
  let initialGlobals = {};
  try {
    const saved = JSON.parse(sessionStorage.getItem("oru:globals") || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) initialGlobals = saved;
  } catch { /* Start with an empty session state. */ }
  const app = data.logic ? run(data.logic, { initialGlobals, output: value => console.log(value) }) : null;
  const persistGlobals = () => {
    if (!app) return;
    try { sessionStorage.setItem("oru:globals", JSON.stringify(app.getGlobalState())); }
    catch (error) { console.error("ORU global state could not be saved:", error); }
  };
  persistGlobals();
  const activate = node => {
    const handler = node.properties["on.click"];
    if (handler && app) { try { app.call(String(handler)); } catch (error) { console.error("ORU click handler failed:", error); } persistGlobals(); render(); }
    if (node.type === "link") {
      const route = String(node.route ?? node.properties.route ?? "");
      const target = Object.prototype.hasOwnProperty.call(data.routes, route) ? data.routes[route] : "";
      if (target) location.href = target;
    }
  };
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const controls = document.getElementById("oru-controls");
  const semantic = document.getElementById("oru-semantic");
  const imageCache = new Map();
  const formIds = new Map();
  const formNodes = [];
  const collectForms = node => { if (node.type === "form") { formIds.set(node, "oru-form-" + (formNodes.length + 1)); formNodes.push(node); } node.children.forEach(collectForms); };
  data.page.widgets.forEach(collectForms);
  let regions = [];
  const px = (value, fallback) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return fallback;
    const match = value.match(/^(-?\\d+(?:\\.\\d+)?)(px|rem|%)?$/);
    if (!match) return fallback;
    const n = Number(match[1]);
    if (match[2] === "%") return canvas.clientWidth * n / 100;
    if (match[2] === "rem") return n * 16;
    return n;
  };
  const prop = (node, key, fallback) => node.properties[key] ?? fallback;
  const color = (node, key, fallback) => String(prop(node, key, fallback));
  const textOf = node => { if (node.binding && app) { const value = app.getGlobals()[node.binding]; return typeof value === "string" ? value : value == null ? "" : JSON.stringify(value); } return node.text ?? ""; };
  function measure(node, maxWidth) {
    const type = node.type;
    const p = node.properties;
    const width = Math.min(maxWidth, Math.max(0, px(p.width, maxWidth)));
    const padding = px(p.padding, 0);
    const gap = px(p.gap, 12);
    if (type === "text" || type === "button" || type === "link") {
      ctx.font = (p.weight ?? "400") + " " + px(p.size, 18) + "px " + (p.font ?? "system-ui");
      const words = textOf(node).split(/\\s+/);
      let line = "", lines = [];
      for (const word of words) {
        const next = line ? line + " " + word : word;
        if (ctx.measureText(next).width > Math.max(40, width - padding * 2) && line) {
          lines.push(line); line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      return { width, height: Math.max(24, lines.length * px(p.line, px(p.size, 18) * 1.4) + padding * 2), lines };
    }
    if (type === "image") return { width, height: px(p.height, 180), lines: [] };
    if (type === "input") return { width, height: px(p.height, 44), lines: [] };
    if (type === "row" || type === "column") {
      const horizontal = type === "row" && width >= px(p.wrapAt, 560);
      const available = Math.max(40, width - padding * 2 - (horizontal ? gap * Math.max(0, node.children.length - 1) : 0));
      const childWidth = horizontal && node.children.length ? available / node.children.length : available;
      const children = node.children.map(child => measure(child, childWidth));
      const main = children.reduce((sum, item) => sum + (horizontal ? item.width : item.height), 0) + gap * Math.max(0, children.length - 1);
      const cross = children.reduce((m, item) => Math.max(m, horizontal ? item.height : item.width), 0);
      return { width: horizontal ? Math.min(width, main + padding * 2) : width, height: (horizontal ? cross : main) + padding * 2, lines: [] };
    }
    const children = node.children.map(child => measure(child, Math.max(40, width - padding * 2)));
    return { width, height: px(p.height, children.reduce((sum, item) => sum + item.height, 0) + padding * 2), lines: [] };
  }
  function draw(node, x, y, maxWidth, formId = null) {
    if (node.type === "form") formId = formIds.get(node) ?? null;
    const p = node.properties;
    const box = measure(node, maxWidth);
    const padding = px(p.padding, 0), gap = px(p.gap, 12);
    const w = Math.min(maxWidth, px(p.width, box.width));
    const h = px(p.height, box.height);
    const bg = p.background ?? p.color;
    if ((bg || node.type === "button") && ["box", "column", "row", "form", "button"].includes(node.type)) {
      ctx.fillStyle = String(bg ?? "#eeeeee");
      const radius = Math.max(0, px(p.radius, 0));
      ctx.beginPath(); if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h); ctx.fill();
    }
    if (node.type === "text" || node.type === "button" || node.type === "link") {
      const size = px(p.size, 18);
      ctx.font = (p.weight ?? (node.type === "button" ? "600" : "400")) + " " + size + "px " + (p.font ?? "system-ui");
      ctx.fillStyle = color(node, "text.color", color(node, "color", "#202124"));
      ctx.textBaseline = "top";
      const lineHeight = px(p.line, size * 1.4);
      box.lines.forEach((line, i) => ctx.fillText(line, x + padding, y + padding + i * lineHeight, Math.max(20, w - padding * 2)));
      if (node.type === "link") ctx.fillRect(x + padding, y + h - 2, Math.min(w - padding * 2, ctx.measureText(textOf(node)).width), 1);
      if (node.type === "button" || node.type === "link") regions.push({ x, y, w, h, node, formId });
      return { width: w, height: h };
    }
    if (node.type === "image") {
      const source = String(p.src ?? "");
      let image = imageCache.get(source);
      if (!image) {
        image = new Image();
        image.onload = () => render();
        image.onerror = () => console.error("ORU image could not be loaded:", source);
        imageCache.set(source, image);
        image.src = source;
      }
      if (image.complete && image.naturalWidth > 0) {
        const fit = String(p.fit ?? "cover");
        const scale = fit === "contain" ? Math.min(w / image.naturalWidth, h / image.naturalHeight) : Math.max(w / image.naturalWidth, h / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale, drawHeight = image.naturalHeight * scale;
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.drawImage(image, x + (w - drawWidth) / 2, y + (h - drawHeight) / 2, drawWidth, drawHeight);
        ctx.restore();
      }
      regions.push({ x, y, w, h, node, formId });
      return { width: w, height: h };
    }
    if (node.type === "input") {
      ctx.fillStyle = color(node, "background", "#ffffff");
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color(node, "border.color", "#999999");
      ctx.strokeRect(x, y, w, h);
      const inputValue = textOf(node);
      const visibleValue = p.type === "password" ? "•".repeat(inputValue.length) : inputValue;
      ctx.fillStyle = visibleValue ? color(node, "text.color", "#202124") : "#777777";
      ctx.font = "14px system-ui";
      ctx.fillText(visibleValue || String(p.placeholder ?? ""), x + 10, y + 14);
      regions.push({ x, y, w, h, node, formId });
      return { width: w, height: h };
    }
    const horizontal = node.type === "row" && w >= px(p.wrapAt, 560);
    let cursor = horizontal ? x + padding : y + padding;
    const available = Math.max(40, w - padding * 2 - (horizontal ? gap * Math.max(0, node.children.length - 1) : 0));
    const childWidth = horizontal && node.children.length ? available / node.children.length : available;
    for (const child of node.children) {
      const childBox = measure(child, childWidth);
      draw(child, horizontal ? cursor : x + padding, horizontal ? y + padding : cursor, childWidth, formId);
      cursor += (horizontal ? childBox.width : childBox.height) + gap;
    }
    return { width: w, height: h };
  }
  function render() {
    const width = Math.max(280, document.documentElement.clientWidth);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.style.width = width + "px";
    const contentHeight = data.page.widgets.reduce((height, widget) => height + measure(widget, width - 40).height + 12, 24);
    const pageHeight = Math.max(window.innerHeight, 600, contentHeight + 24);
    canvas.height = Math.ceil(pageHeight * dpr);
    canvas.style.height = pageHeight + "px";
    controls.style.height = pageHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, canvas.height / dpr);
    regions = [];
    let cursorY = 24;
    for (const widget of data.page.widgets) {
      const size = measure(widget, width - 40);
      draw(widget, 20, cursorY, width - 40);
      cursorY += size.height + 12;
    }
    controls.replaceChildren();
    semantic.replaceChildren();
    const addSemantic = (node, parent) => {
      if (node.type === "text") { const item = document.createElement("p"); item.textContent = textOf(node); parent.append(item); }
      if (node.type === "image") { const item = document.createElement("img"); item.alt = String(node.text ?? ""); item.src = String(node.properties.src ?? ""); parent.append(item); }
      node.children.forEach(child => addSemantic(child, parent));
    };
    data.page.widgets.forEach(node => addSemantic(node, semantic));
    const forms = new Map();
    for (const node of formNodes) {
      const form = document.createElement("form");
      form.id = formIds.get(node);
      form.style.cssText = "position:absolute;inset:0;pointer-events:none;";
      form.addEventListener("submit", event => {
        event.preventDefault();
        try {
          if (app) app.call(String(node.properties["on.submit"]));
          persistGlobals();
          render();
        } catch (error) { console.error("ORU form submission failed:", error); }
      });
      forms.set(form.id, form);
      controls.append(form);
    }
    for (const region of regions) {
      const node = region.node;
      const el = document.createElement(node.type === "link" ? "a" : node.type === "input" ? "input" : "button");
      el.style.cssText = "position:absolute;overflow:hidden;left:" + region.x + "px;top:" + region.y + "px;width:" + region.w + "px;height:" + region.h + "px;pointer-events:auto;";
      if (node.type === "input") {
        el.style.opacity = "1";
        el.style.background = "transparent";
        el.style.border = "0";
        el.style.outlineOffset = "-2px";
        el.style.padding = "0 10px";
        el.style.color = "#202124";
        el.style.font = "16px system-ui";
      } else {
        el.style.opacity = ".001";
      }
      el.setAttribute("aria-label", textOf(node) || String(node.properties.placeholder ?? node.type));
      if (node.type === "link") {
        const route = String(node.route ?? node.properties.route ?? "");
        el.href = Object.prototype.hasOwnProperty.call(data.routes, route) ? data.routes[route] : "#";
      } else if (node.type === "input") {
        el.placeholder = String(node.properties.placeholder ?? "");
        el.type = String(node.properties.type ?? "text");
        el.autocomplete = String(node.properties.autocomplete ?? (el.type === "password" ? "current-password" : "on"));
        if (node.properties.required === true) el.required = true;
        if (node.properties.disabled === true) el.disabled = true;
        if (node.properties.readOnly === true) el.readOnly = true;
        if (node.properties.constraint === "numbers") el.pattern = "[0-9]+";
        else if (node.properties.constraint === "letters") el.pattern = "[A-Za-z]+";
        else if (typeof node.properties.pattern === "string") el.pattern = node.properties.pattern;
        for (const key of ["min", "max", "step", "maxLength", "minLength", "name"]) {
          if (node.properties[key] !== undefined) el[key] = node.properties[key];
        }
        if (node.binding && app) {
          el.value = textOf(node);
          el.addEventListener("input", () => {
            try { app.set(node.binding, el.value); persistGlobals(); }
            catch (error) { console.error("ORU input binding failed:", error); }
          });
        }
      } else {
        el.type = region.formId ? "submit" : "button";
        if (node.properties.disabled === true) el.disabled = true;
        if (!region.formId) el.addEventListener("click", () => activate(node));
      }
      if (node.type === "link") el.addEventListener("click", event => { event.preventDefault(); activate(node); });
      const parent = region.formId ? forms.get(region.formId) : controls;
      parent.append(el);
    }
  }
  canvas.addEventListener("click", event => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const hit = regions.find(item => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
    if (!hit) return;
    if (hit.node.type === "button" || hit.node.type === "link") activate(hit.node);
  });
  window.addEventListener("resize", render);
  render();
})();
`;
}

export function compilePage(page: OruPage, route: PageRoute, routes: Record<string, string>): string {
  const title = escapeHtml(page.metadata.title || "ORU");
  const description = escapeHtml(page.metadata.description || "");
  const language = escapeHtml(page.metadata.language || "en");
  const depth = route.output.split("/").length - 1;
  const corePath = depth === 0 ? "./_oru/core.js" : "../".repeat(depth) + "_oru/core.js";
  const resolvedPage = { ...page, widgets: page.widgets.map(widget => resolveWidget(widget, page.classes)) };
  const declaredBindings = new Set([...page.logic.matchAll(/(?:^|\n)\s*(?:state|global)\s+([A-Za-z_]\w*)\s*=/g)].map(match => match[1]!));
  const globalBindings = new Set([...page.logic.matchAll(/(?:^|\n)\s*global\s+([A-Za-z_]\w*)\s*=/g)].map(match => match[1]!));
  const declaredFunctions = new Set([...page.logic.matchAll(/\bfunc\s+([A-Za-z_]\w*)\s*\(/g)].map(match => match[1]!));
  for (const widget of resolvedPage.widgets) { validateLinks(widget, routes); validateBindings(widget, declaredBindings, globalBindings); validateForms(widget, declaredFunctions); }
  const script = runtimeSource(resolvedPage, routes, corePath);
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<title>${title}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:system-ui,sans-serif;background:#fff;color:#202124}
body{overflow-x:hidden}canvas{display:block;max-width:100%;touch-action:manipulation}
#oru-controls{position:absolute;top:0;left:0;width:100%;pointer-events:none}
#oru-controls>*{pointer-events:auto}
.oru-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
#oru-controls button:focus-visible,#oru-controls a:focus-visible{opacity:1!important;outline:2px solid #2457d6;outline-offset:2px}
#oru-controls input:focus-visible{outline:2px solid #2457d6}
</style>
</head>
<body>
<canvas aria-hidden="true"></canvas>
<div id="oru-semantic" class="oru-sr-only"></div>
<div id="oru-controls" aria-label="Page controls"></div>
<script type="module">${script}</script>
</body>
</html>`;
}
