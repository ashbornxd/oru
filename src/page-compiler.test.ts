import test from "node:test";
import assert from "node:assert/strict";
import { parsePage } from "./project.js";
import { routeForPage } from "./routes.js";
import { compilePage } from "./page-compiler.js";

test("emits an accessible Canvas page shell and safely escaped metadata", () => {
  const page = parsePage(`metadata:
    title: "A <safe> title"
    description: "Description"
page:
    column:
        text("Hello")
        button("Continue")
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('<canvas aria-hidden="true"'));
  assert.ok(html.includes("A &lt;safe&gt; title"));
  assert.ok(html.includes("oru-controls"));
  assert.ok(html.includes("Continue"));
});

test("loads page logic and wires button click handlers", () => {
  const page = parsePage(`logic:
    func save():
        print("saved")
page:
    button("Save"):
        on.click: save
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('import { run } from "./_oru/core.js";'));
  assert.ok(html.includes("app.call(String(handler))"));
  assert.ok(html.includes('type="module"'));
});

test("uses a relative interpreter path for nested routes", () => {
  const page = parsePage(`logic:
    func help():
        print("help")
page:
    button("Help"):
        on.click: help
`);
  const html = compilePage(page, routeForPage("pages/help.oru"), { "pages/help": "/pages/help" });
  assert.ok(html.includes('import { run } from "../../_oru/core.js";'));
});
test("binds page text to mutable ORU state", () => {
  const page = parsePage(`logic:
    state count = 0
    func increment():
        count = count + 1
page:
    column:
        text(count)
        button("Add"):
            on.click: increment
`);
  assert.equal(page.widgets[0]?.children[0]?.binding, "count");
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes("app.getGlobals()"));
});
test("applies compatible page-local style classes to widgets", () => {
  const page = parsePage(`class navText:
    color: #123456
    size: 24
page:
    text("Styled"):
        class: navText
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes("#123456"));
  assert.ok(html.includes('"size":24'));
});

test("rejects style properties that do not match a widget type", () => {
  const page = parsePage(`class navText:
    radius: 8
page:
    text("Styled"):
        class: navText
`);
  assert.throws(() => compilePage(page, routeForPage("index.oru"), { index: "/" }), /not supported by text/);
});
test("binds input values to page state and updates the interpreter", () => {
  const page = parsePage(`logic:
    state email = pass
page:
    input(email):
        type: email
        required: true
`);
  assert.equal(page.widgets[0]?.binding, "email");
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes("app.set(node.binding, value)"));
  assert.ok(html.includes("replacement.focus()"));
  assert.ok(html.includes("replacement.setSelectionRange(start, end)"));
  assert.ok(html.includes("el.required = true"));
});

test("compiles native form validation and submit handlers", () => {
  const page = parsePage(`logic:
    state email = ""
    func register():
        print(email)
page:
    form:
        on.submit: register
        input(email):
            type: email
            required: true
        button("Create account")
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('form.addEventListener("submit"'));
  assert.ok(html.includes('el.type = region.formId ? "submit" : "button"'));
  assert.ok(html.includes('forms.set(form.id, form)'));
  assert.ok(html.includes('parent.append(el)'));
  assert.ok(html.includes('app.call(String(node.properties["on.submit"]))'));
});

test("rejects forms without a declared submit function", () => {
  const page = parsePage(`page:
    form:
        on.submit: missing
        button("Send")
`);
  assert.throws(() => compilePage(page, routeForPage("index.oru"), { index: "/" }), /requires on.submit/);
});

test("rejects nested forms and click handlers on submit buttons", () => {
  const nested = parsePage(`logic:
    func send():
        print("sent")
page:
    form:
        on.submit: send
        form:
            on.submit: send
            button("Send")
`);
  assert.throws(() => compilePage(nested, routeForPage("index.oru"), { index: "/" }), /cannot be nested/);

  const click = parsePage(`logic:
    func send():
        print("sent")
page:
    form:
        on.submit: send
        button("Send"):
            on.click: send
`);
  assert.throws(() => compilePage(click, routeForPage("index.oru"), { index: "/" }), /use on.submit/);
});


test("builds a scrollable responsive page and accessible semantic content", () => {
  const page = parsePage(`page:
    column:
        text("Accessible title")
        row:
            text("Left")
            text("Right")
        image("assets/logo.png", "ORU logo")
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('<canvas aria-hidden="true"></canvas>'));
  assert.ok(html.includes('id="oru-semantic"'));
  assert.ok(html.includes('item.textContent = textOf(node)'));
  assert.ok(html.includes('item.alt = String(node.properties.alt ?? node.text ?? "")'));
  assert.ok(html.includes('const contentHeight = data.page.widgets.reduce'));
  assert.ok(html.includes('controls.style.height = pageHeight + "px"'));
  assert.ok(html.includes('width >= px(p.wrapAt, 560)'));
});

test("supports native input constraints and disabled controls", () => {
  const page = parsePage(`logic:
    state age = ""
page:
    input(age):
        type: number
        required: true
        min: 1
        max: 99
        step: 1
        disabled: true
    button("Continue"):
        disabled: true
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('el.disabled = true'));
  assert.ok(html.includes('el[key] = node.properties[key]'));
  assert.ok(html.includes('node.type === "input" ? ["min", "max", "step", "maxLength", "minLength", "name"]'));
});


test("compiles button hover, active, disabled states, and icon controls", () => {
  const page = parsePage(`logic:
    func highlight():
        print("hover")
    func press():
        print("active")
    func leave():
        print("leave")
page:
    button("Continue"):
        icon: "assets/arrow.png"
        alt: "Continue"
        hover.background: #dddddd
        active.background: #bbbbbb
        disabled.background: #eeeeee
        on.hover: highlight
        on.active: press
        on.leave: leave
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('p["hover.background"]'));
  assert.ok(html.includes('p["active.background"]'));
  assert.ok(html.includes('p["disabled.background"]'));
  assert.ok(html.includes('controls.addEventListener("pointerover"'));
  assert.ok(html.includes('controls.addEventListener("pointerdown"'));
  assert.ok(html.includes('runStateEvent(node, "on.leave")'));
  assert.ok(html.includes('String(p.icon ?? "")'));
});

test("rejects button event handlers that do not exist", () => {
  const page = parsePage(`page:
    button("Continue"):
        on.hover: missing
`);
  assert.throws(() => compilePage(page, routeForPage("index.oru"), { index: "/" }), /on.hover must reference a function/);
});


test("exposes headings, form labels, and stable input accessible names", () => {
  const page = parsePage(`logic:
    state email = ""
    func send():
        print(email)
page:
    text("Create account"):
        role: heading
        level: 1
    form:
        label: Registration form
        on.submit: send
        input(email):
            label: Email address
            type: email
        button("Submit")
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('<main id="oru-semantic"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes('document.createElement(role === "heading" ? "h" + level : "p")'));
  assert.ok(html.includes('form.setAttribute("aria-label", String(node.properties.label ?? "Form"))'));
  assert.ok(html.includes('node.properties.label ?? node.properties.placeholder ?? node.binding ?? (node.type === "textarea" ? "Text area" : node.type === "select" ? "Select" : "Input")'));
  assert.ok(html.includes('if (region.formId && !parent.isConnected) controls.append(parent)'));
});

test("supports custom native validation messages on inputs", () => {
  const page = parsePage(`page:
    input("Email"):
        type: email
        required: true
        validationMessage: "Please enter a valid email address."
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('el.setCustomValidity(message)'));
  assert.ok(html.includes('node.properties.validationMessage'));
});

test("renders bound multiline textarea controls with accessible labels", () => {
  const page = parsePage(`logic:
    state message = ""
page:
    textarea(message):
        label: Message
        placeholder: Write your message
        rows: 5
        maxLength: 500
        required: true
`);
  assert.equal(page.widgets[0]?.type, "textarea");
  assert.equal(page.widgets[0]?.binding, "message");
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('node.type === "textarea" ? "textarea"'));
  assert.ok(html.includes('el.rows = Number(node.properties.rows ?? 4)'));
  assert.ok(html.includes('node.properties.label ?? node.properties.placeholder'));
  assert.ok(html.includes('el.addEventListener("input"'));
});


test("renders accessible select controls bound to page state", () => {
  const page = parsePage(`logic:
    state country = "India"
page:
    select(country):
        label: Country
        required: true
        option("India")
        option("Japan")
`);
  assert.equal(page.widgets[0]?.type, "select");
  assert.equal(page.widgets[0]?.binding, "country");
  assert.equal(page.widgets[0]?.children.length, 2);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('node.type === "select" ? "select"'));
  assert.ok(html.includes('document.createElement("option")'));
  assert.ok(html.includes('el.addEventListener(node.type === "select" ? "change" : "input"'));
});


test("select placeholder remains unselected so required validation works", () => {
  const page = parsePage(`logic:
    state country = ""
page:
    select(country):
        label: Country
        placeholder: Choose a country
        required: true
        option("India")
        option("Japan")
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('placeholder.value = ""'));
  assert.ok(html.includes('placeholder.disabled = true'));
  assert.ok(html.includes('placeholder.selected = !textOf(node)'));
  assert.ok(html.includes('el.required = true'));
});

test("supports accessible native file selection and filename state bindings", () => {
  const page = parsePage(`logic:
    state avatar = ""
    state attachments = []
page:
    input(avatar):
        type: file
        accept: "image/png,image/jpeg"
        required: true
        label: Profile image
    input(attachments):
        type: file
        accept: ".pdf"
        multiple: true
        label: Attachments
`);
  const html = compilePage(page, routeForPage("index.oru"), { index: "/" });
  assert.ok(html.includes('el.type = String(node.properties.type ?? "text")'));
  assert.ok(html.includes('el.accept = node.properties.accept'));
  assert.ok(html.includes('el.multiple = true'));
  assert.ok(html.includes('const isFileInput = node.type === "input" && node.properties.type === "file"'));
  assert.ok(html.includes('Array.from(el.files ?? []).map(file => file.name)'));
  assert.ok(html.includes('node.properties.multiple === true ? names : (names[0] ?? "")'));
  assert.ok(html.includes('if (node.type !== "select" && !isFileInput) el.value = textOf(node)'));
});
