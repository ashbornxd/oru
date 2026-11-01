import type { OruPage } from "./project.js";
import type { PageRoute } from "./routes.js";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function runtimeSource(page: OruPage, routes: Record<string, string>, corePath: string): string {
  const payload = JSON.stringify({ page, routes, logic: page.logic }).replace(/</g, "\\u003c");
  return `
${page.logic.trim() ? `import { run } from "${corePath}";` : ""}
(() => {
  const data = ${payload};
  const app = data.logic ? run(data.logic) : null;
  const activate = node => {
    const handler = node.properties["on.click"];
    if (handler && app) { app.call(String(handler)); render(); }
    if (node.type === "link") {
      const route = String(node.route ?? node.properties.route ?? "");
      const target = data.routes[route] ?? route;
      if (target) location.href = target;
    }
  };
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const controls = document.getElementById("oru-controls");
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
  const textOf = node => node.text ?? "";
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
      const horizontal = type === "row";
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
  function draw(node, x, y, maxWidth) {
    const p = node.properties;
    const box = measure(node, maxWidth);
    const padding = px(p.padding, 0), gap = px(p.gap, 12);
    const w = Math.min(maxWidth, px(p.width, box.width));
    const h = px(p.height, box.height);
    const bg = p.background ?? p.color;
    if (bg && ["box", "column", "row"].includes(node.type)) {
      ctx.fillStyle = String(bg);
      const radius = Math.max(0, px(p.radius, 0));
      ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
    }
    if (node.type === "text" || node.type === "button" || node.type === "link") {
      const size = px(p.size, 18);
      ctx.font = (p.weight ?? (node.type === "button" ? "600" : "400")) + " " + size + "px " + (p.font ?? "system-ui");
      ctx.fillStyle = color(node, "text.color", color(node, "color", "#202124"));
      ctx.textBaseline = "top";
      const lineHeight = px(p.line, size * 1.4);
      box.lines.forEach((line, i) => ctx.fillText(line, x + padding, y + padding + i * lineHeight, Math.max(20, w - padding * 2)));
      if (node.type === "link") ctx.fillRect(x + padding, y + h - 2, Math.min(w - padding * 2, ctx.measureText(textOf(node)).width), 1);
      if (node.type === "button" || node.type === "link") regions.push({ x, y, w, h, node });
      return { width: w, height: h };
    }
    if (node.type === "image") {
      const image = new Image();
      image.onload = () => { ctx.drawImage(image, x, y, w, h); };
      image.src = String(p.src ?? "");
      regions.push({ x, y, w, h, node });
      return { width: w, height: h };
    }
    if (node.type === "input") {
      ctx.strokeStyle = color(node, "border.color", "#999999");
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#777777"; ctx.font = "14px system-ui";
      ctx.fillText(String(p.placeholder ?? ""), x + 10, y + 14);
      regions.push({ x, y, w, h, node });
      return { width: w, height: h };
    }
    const horizontal = node.type === "row";
    let cursor = horizontal ? x + padding : y + padding;
    const available = Math.max(40, w - padding * 2 - (horizontal ? gap * Math.max(0, node.children.length - 1) : 0));
    const childWidth = horizontal && node.children.length ? available / node.children.length : available;
    for (const child of node.children) {
      const childBox = measure(child, childWidth);
      draw(child, horizontal ? cursor : x + padding, horizontal ? y + padding : cursor, childWidth);
      cursor += (horizontal ? childBox.width : childBox.height) + gap;
    }
    return { width: w, height: h };
  }
  function render() {
    const width = Math.max(280, document.documentElement.clientWidth);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(Math.max(window.innerHeight, 600) * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = Math.max(window.innerHeight, 600) + "px";
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
    for (const region of regions) {
      const node = region.node;
      const el = document.createElement(node.type === "link" ? "a" : node.type === "input" ? "input" : "button");
      el.style.cssText = "position:absolute;opacity:.001;overflow:hidden;left:" + region.x + "px;top:" + region.y + "px;width:" + region.w + "px;height:" + region.h + "px;";
      el.setAttribute("aria-label", textOf(node) || String(node.properties.placeholder ?? node.type));
      if (node.type === "link") {
        const route = String(node.route ?? node.properties.route ?? "");
        el.href = data.routes[route] ?? route;
      } else if (node.type === "input") {
        el.placeholder = String(node.properties.placeholder ?? "");
        el.type = String(node.properties.type ?? "text");
        el.autocomplete = el.type === "password" ? "current-password" : "on";
      } else {
        el.type = "button";
        el.addEventListener("click", () => activate(node));
      }
      if (node.type === "link") el.addEventListener("click", event => { event.preventDefault(); activate(node); });
      controls.append(el);
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
  const corePath = "../".repeat(depth) + "_oru/core.js";
  const script = runtimeSource(page, routes, corePath);
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
#oru-controls{position:absolute;inset:0;pointer-events:none}
#oru-controls>*{pointer-events:auto}
</style>
</head>
<body>
<canvas role="img" aria-label="${title}"></canvas>
<div id="oru-controls" aria-label="Page controls"></div>
<script type="module">${script}</script>
</body>
</html>`;
}
