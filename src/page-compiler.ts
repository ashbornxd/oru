import { OruError } from "./ast.js";
import type { OruPage, PageWidget } from "./project.js";
import type { PageRoute } from "./routes.js";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const classProperties: Record<PageWidget["type"], Set<string>> = {
  column: new Set(["background", "padding", "gap", "width", "height"]),
  row: new Set(["background", "padding", "gap", "width", "height", "wrapAt"]),
  box: new Set(["background", "padding", "radius", "width", "height", "gap"]),
  form: new Set(["background", "padding", "radius", "width", "height", "gap"]),
  text: new Set(["color", "text.color", "size", "weight", "font", "line", "align", "role", "level"]),
  button: new Set(["color", "background", "size", "weight", "radius", "padding", "width", "disabled", "icon", "alt", "hover.background", "hover.color", "active.background", "active.color", "disabled.background", "disabled.color", "text.color", "align"]),
  link: new Set(["color", "text.color", "size", "weight", "decoration", "underline"]),
  image: new Set(["width", "height", "fit", "radius"]),
  input: new Set(["color", "background", "size", "radius", "padding", "width", "height", "type", "required", "disabled", "readOnly", "min", "max", "step", "minLength", "maxLength", "pattern", "autocomplete", "constraint", "validationMessage", "name", "text.color", "border.color", "label"]),
  textarea: new Set(["color", "background", "size", "radius", "padding", "width", "height", "required", "disabled", "readOnly", "minLength", "maxLength", "validationMessage", "name", "text.color", "border.color", "label", "rows"]),
  select: new Set(["color", "background", "size", "radius", "padding", "width", "height", "required", "disabled", "name", "text.color", "border.color", "label"]),
  option: new Set([])
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
function validateEvents(widget: PageWidget, functions: Set<string>): void {
  if (widget.type === "button" || widget.type === "link") {
    const events = widget.type === "button" ? ["on.click", "on.hover", "on.active", "on.leave"] : ["on.click"];
    for (const event of events) {
      const handler = widget.properties[event];
      if (handler !== undefined && (typeof handler !== "string" || !functions.has(handler))) {
        throw new OruError(event + " must reference a function declared in logic:.", widget.line);
      }
    }
  }
  for (const child of widget.children) validateEvents(child, functions);
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
  let hoveredNode = null;
  let activeNode = null;
  let pixelRatio = 1;
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
      const iconSpace = type === "button" && p.icon ? 28 : 0;
      const words = textOf(node).split(/\\s+/);
      let line = "", lines = [];
      for (const word of words) {
        const next = line ? line + " " + word : word;
        if (ctx.measureText(next).width > Math.max(40, width - padding * 2 - iconSpace) && line) {
          lines.push(line); line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      return { width, height: Math.max(type === "button" && p.icon ? 44 : 24, lines.length * px(p.line, px(p.size, 18) * 1.4) + padding * 2), lines };
    }
    if (type === "image") return { width, height: px(p.height, 180), lines: [] };
    if (type === "input" || type === "textarea" || type === "select") return { width, height: px(p.height, type === "textarea" ? Math.max(88, px(p.rows, 4) * 22) : 44), lines: [] };
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
    const disabled = node.type === "button" && p.disabled === true;
    const baseBackground = p.background ?? (node.type === "button" ? "#eeeeee" : p.color);
    const bg = node.type === "button"
      ? disabled ? p["disabled.background"] ?? "#e5e5e5"
        : node === activeNode ? p["active.background"] ?? baseBackground
        : node === hoveredNode ? p["hover.background"] ?? baseBackground
        : baseBackground
      : baseBackground;
    if ((bg || node.type === "button") && ["box", "column", "row", "form", "button"].includes(node.type)) {
      ctx.fillStyle = String(bg ?? "#eeeeee");
      const radius = Math.max(0, px(p.radius, 0));
      ctx.beginPath(); if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h); ctx.fill();
    }
    if (node.type === "text" || node.type === "button" || node.type === "link") {
      const size = px(p.size, 18);
      ctx.font = (p.weight ?? (node.type === "button" ? "600" : "400")) + " " + size + "px " + (p.font ?? "system-ui");
      const defaultTextColor = disabled ? "#777777" : "#202124";
      const textColor = node.type === "button"
        ? disabled ? p["disabled.color"] ?? defaultTextColor
          : node === activeNode ? p["active.color"] ?? color(node, "text.color", color(node, "color", defaultTextColor))
          : node === hoveredNode ? p["hover.color"] ?? color(node, "text.color", color(node, "color", defaultTextColor))
          : color(node, "text.color", color(node, "color", defaultTextColor))
        : color(node, "text.color", color(node, "color", defaultTextColor));
      ctx.fillStyle = String(textColor);
      ctx.textBaseline = "top";
      const iconSource = node.type === "button" ? String(p.icon ?? "") : "";
      if (iconSource) {
        let icon = imageCache.get(iconSource);
        if (!icon) { icon = new Image(); icon.onload = () => render(); icon.onerror = () => console.error("ORU button icon could not be loaded:", iconSource); imageCache.set(iconSource, icon); icon.src = iconSource; }
        if (icon.complete && icon.naturalWidth > 0) ctx.drawImage(icon, x + padding, y + padding, 20, 20);
      }
      const align = ["left", "center", "right"].includes(String(p.align)) ? String(p.align) : "left";
      ctx.textAlign = align;
      const textOffset = padding + (iconSource ? 28 : 0);
      const textX = align === "center" ? x + w / 2 : align === "right" ? x + w - padding : x + textOffset;
      const lineHeight = px(p.line, size * 1.4);
      box.lines.forEach((line, i) => ctx.fillText(line, textX, y + padding + i * lineHeight, Math.max(20, w - padding * 2 - (iconSource ? 28 : 0))));
      ctx.textAlign = "left";
      if (node.type === "link" && p.underline !== false && p.decoration !== "none") ctx.fillRect(x + padding, y + h - 2, Math.min(w - padding * 2, ctx.measureText(textOf(node)).width), 1);
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
        ctx.beginPath();
        const radius = Math.max(0, px(p.radius, 0));
        if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.drawImage(image, x + (w - drawWidth) / 2, y + (h - drawHeight) / 2, drawWidth, drawHeight);
        ctx.restore();
      }
      regions.push({ x, y, w, h, node, formId });
      return { width: w, height: h };
    }
    if (node.type === "input" || node.type === "textarea" || node.type === "select") {
      ctx.fillStyle = color(node, "background", "#ffffff");
      const radius = Math.max(0, px(p.radius, 0));
      ctx.beginPath(); if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h); ctx.fill();
      ctx.strokeStyle = color(node, "border.color", "#999999");
      ctx.beginPath(); if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h); ctx.stroke();
      const inputValue = textOf(node);
      const firstOption = node.type === "select" ? node.children.find(option => option.type === "option") : undefined;
      const selectedValue = node.type === "select" ? (inputValue || String(firstOption?.properties.value ?? firstOption?.text ?? "")) : inputValue;
      const visibleValue = node.type === "input" && p.type === "password" ? "•".repeat(inputValue.length) : node.type === "select" ? (inputValue || selectedValue) : inputValue;
      ctx.fillStyle = visibleValue ? color(node, "text.color", "#202124") : "#777777";
      ctx.font = px(p.size, 14) + "px system-ui";
      const displayText = visibleValue || String(p.placeholder ?? "");
      displayText.split("\n").slice(0, node.type === "textarea" ? Math.max(1, Math.floor((h - 20) / 20)) : 1).forEach((line, index) => ctx.fillText(line, x + 10, y + 14 + index * 20, w - 20));
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
  function paint() {
    const width = Math.max(280, document.documentElement.clientWidth);
    ctx.clearRect(0, 0, width, canvas.height / pixelRatio);
    regions = [];
    let cursorY = 24;
    for (const widget of data.page.widgets) {
      const size = measure(widget, width - 40);
      draw(widget, 20, cursorY, width - 40);
      cursorY += size.height + 12;
    }
  }
  function render() {
    const width = Math.max(280, document.documentElement.clientWidth);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    pixelRatio = dpr;
    canvas.width = Math.floor(width * dpr);
    canvas.style.width = width + "px";
    const contentHeight = data.page.widgets.reduce((height, widget) => height + measure(widget, width - 40).height + 12, 24);
    const pageHeight = Math.max(window.innerHeight, 600, contentHeight + 24);
    canvas.height = Math.ceil(pageHeight * dpr);
    canvas.style.height = pageHeight + "px";
    controls.style.height = pageHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint();
    controls.replaceChildren();
    semantic.replaceChildren();
    const addSemantic = (node, parent) => {
      if (node.type === "text") {
        const role = String(node.properties.role ?? "");
        const level = Math.max(1, Math.min(6, Number(node.properties.level ?? 2)));
        const item = document.createElement(role === "heading" ? "h" + level : "p");
        item.textContent = textOf(node);
        parent.append(item);
      }
      if (node.type === "image") { const item = document.createElement("img"); item.alt = String(node.properties.alt ?? node.text ?? ""); item.src = String(node.properties.src ?? ""); parent.append(item); }
      node.children.forEach(child => addSemantic(child, parent));
    };
    data.page.widgets.forEach(node => addSemantic(node, semantic));
    const forms = new Map();
    for (const node of formNodes) {
      const form = document.createElement("form");
      form.id = formIds.get(node);
      form.style.cssText = "position:absolute;inset:0;pointer-events:none;";
      form.setAttribute("aria-label", String(node.properties.label ?? "Form"));
      form.addEventListener("submit", event => {
        event.preventDefault();
        try {
          if (app) app.call(String(node.properties["on.submit"]));
          persistGlobals();
          render();
        } catch (error) { console.error("ORU form submission failed:", error); }
      });
      forms.set(form.id, form);
    }
    for (const [regionIndex, region] of regions.entries()) {
      const node = region.node;
      const el = document.createElement(node.type === "link" ? "a" : node.type === "input" ? "input" : node.type === "textarea" ? "textarea" : node.type === "select" ? "select" : "button");
      el.dataset.oruControl = String(regionIndex);
      el.style.cssText = "position:absolute;overflow:hidden;left:" + region.x + "px;top:" + region.y + "px;width:" + region.w + "px;height:" + region.h + "px;pointer-events:auto;";
      if (node.type === "input" || node.type === "textarea" || node.type === "select") {
        el.style.opacity = "1";
        el.style.background = "transparent";
        el.style.border = "0";
        el.style.outlineOffset = "-2px";
        el.style.padding = "0 " + px(node.properties.padding, 10) + "px";
        el.style.color = String(node.properties["text.color"] ?? node.properties.color ?? "#202124");
        el.style.font = px(node.properties.size, 16) + "px system-ui";
      } else {
        el.style.opacity = ".001";
        el.style.background = "transparent";
        el.style.border = "0";
        el.style.padding = "0";
        el.style.color = "transparent";
        el.style.appearance = "none";
        el.style.cursor = "pointer";
      }
      const accessibleLabel = node.type === "input" || node.type === "textarea" || node.type === "select"
        ? node.properties.label ?? node.properties.placeholder ?? node.binding ?? (node.type === "textarea" ? "Text area" : node.type === "select" ? "Select" : "Input")
        : textOf(node) || node.properties.alt || node.type;
      el.setAttribute("aria-label", String(accessibleLabel));
      if (node.type === "link") {
        const route = String(node.route ?? node.properties.route ?? "");
        el.href = Object.prototype.hasOwnProperty.call(data.routes, route) ? data.routes[route] : "#";
      } else if (node.type === "input" || node.type === "textarea" || node.type === "select") {
        if (node.type === "select") {
          for (const option of node.children) {
            if (option.type !== "option") continue;
            const item = document.createElement("option");
            item.value = String(option.properties.value ?? option.text ?? "");
            item.textContent = String(option.text ?? item.value);
            el.append(item);
          }
          const firstOption = node.children.find(option => option.type === "option");
          el.value = textOf(node) || String(firstOption?.properties.value ?? firstOption?.text ?? "");
        }
        el.placeholder = String(node.properties.placeholder ?? "");
        if (node.type === "input") {
          el.type = String(node.properties.type ?? "text");
          el.autocomplete = String(node.properties.autocomplete ?? (el.type === "password" ? "current-password" : "on"));
        } else if (node.type === "textarea") {
          el.rows = Number(node.properties.rows ?? 4);
          el.style.resize = "none";
          el.style.whiteSpace = "pre-wrap";
        }
        if (node.properties.required === true) el.required = true;
        if (node.properties.disabled === true) el.disabled = true;
        if (node.properties.readOnly === true) el.readOnly = true;
        if (node.type === "input" && node.properties.constraint === "numbers") el.pattern = "[0-9]+";
        else if (node.type === "input" && node.properties.constraint === "letters") el.pattern = "[A-Za-z]+";
        else if (node.type === "input" && typeof node.properties.pattern === "string") el.pattern = node.properties.pattern;
        if (node.type !== "select" && typeof node.properties.validationMessage === "string" && node.properties.validationMessage.length > 0) {
          const message = String(node.properties.validationMessage);
          el.addEventListener("invalid", () => el.setCustomValidity(message));
          el.addEventListener("input", () => el.setCustomValidity(""));
          el.addEventListener("change", () => el.setCustomValidity(""));
        }
        for (const key of (node.type === "input" ? ["min", "max", "step", "maxLength", "minLength", "name"] : node.type === "textarea" ? ["maxLength", "minLength", "name"] : ["name"])) {
          if (node.properties[key] !== undefined) el[key] = node.properties[key];
        }
        if (node.binding && app) {
          if (node.type !== "select") el.value = textOf(node);
          el.addEventListener(node.type === "select" ? "change" : "input", () => {
            try {
              const start = el.selectionStart, end = el.selectionEnd;
              const current = app.getGlobals()[node.binding];
              const numeric = node.type !== "select" && (typeof current === "number" || (current === undefined && ["number", "range"].includes(el.type)));
              const value = numeric ? (el.value === "" ? null : Number(el.value)) : el.value;
              if (value === null || (typeof value === "number" && !Number.isFinite(value))) return;
              app.set(node.binding, value);
              persistGlobals();
              render();
              const replacement = controls.querySelector("[data-oru-control=\\\"" + regionIndex + "\\\"]");
              if (replacement) {
                replacement.focus();
                if (typeof start === "number" && typeof end === "number" && typeof replacement.setSelectionRange === "function") replacement.setSelectionRange(start, end);
              }
            } catch (error) { console.error("ORU input binding failed:", error); }
          });
        }
      } else {
        el.type = region.formId ? "submit" : "button";
        if (node.properties.disabled === true) el.disabled = true;
        if (!region.formId) el.addEventListener("click", () => activate(node));
      }
      if (node.type === "link") el.addEventListener("click", event => { event.preventDefault(); activate(node); });
      const parent = region.formId ? forms.get(region.formId) : controls;
      if (region.formId && !parent.isConnected) controls.append(parent);
      parent.append(el);
    }
  }
  const controlNode = event => {
    const target = event.target instanceof Element ? event.target.closest("[data-oru-control]") : null;
    if (!target) return null;
    return regions[Number(target.dataset.oruControl)]?.node ?? null;
  };
  const runStateEvent = (node, key) => {
    const handler = node?.properties?.[key];
    if (handler && app) {
      try { app.call(String(handler)); persistGlobals(); render(); }
      catch (error) { console.error("ORU " + key + " handler failed:", error); }
    }
  };
  controls.addEventListener("pointerover", event => {
    const node = controlNode(event);
    if (!node || node.type !== "button" || node.properties.disabled === true || hoveredNode === node) return;
    hoveredNode = node;
    paint();
    runStateEvent(node, "on.hover");
  });
  controls.addEventListener("pointerout", event => {
    if (!(event.target instanceof Element) || !event.target.isConnected) return;
    const node = controlNode(event);
    if (!node || node !== hoveredNode) return;
    if (event.relatedTarget instanceof Node && event.target.contains(event.relatedTarget)) return;
    hoveredNode = null;
    paint();
    runStateEvent(node, "on.leave");
  });
  controls.addEventListener("pointerdown", event => {
    const node = controlNode(event);
    if (event.button !== 0 || !node || node.type !== "button" || node.properties.disabled === true) return;
    activeNode = node;
    paint();
    runStateEvent(node, "on.active");
  });
  const clearActive = () => { if (activeNode) { activeNode = null; paint(); } };
  window.addEventListener("pointerup", clearActive);
  window.addEventListener("pointercancel", clearActive);
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
  const declaredBindings = new Set([...page.logic.matchAll(/^(?:(?:state|global)\s+)?([A-Za-z_]\w*)\s*=/gm)].map(match => match[1]!));
  const globalBindings = new Set([...page.logic.matchAll(/^global\s+([A-Za-z_]\w*)\s*=/gm)].map(match => match[1]!));
  const declaredFunctions = new Set([...page.logic.matchAll(/\bfunc\s+([A-Za-z_]\w*)\s*\(/g)].map(match => match[1]!));
  for (const widget of resolvedPage.widgets) { validateLinks(widget, routes); validateBindings(widget, declaredBindings, globalBindings); validateForms(widget, declaredFunctions); validateEvents(widget, declaredFunctions); }
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
<main id="oru-semantic" class="oru-sr-only" aria-label="${title}" aria-live="polite"></main>
<div id="oru-controls" aria-label="Page controls"></div>
<script type="module">${script}</script>
</body>
</html>`;
}
