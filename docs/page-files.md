# ORU page files (1.0 development)

Each `.oru` page file defines exactly one page. A project contains an `oru.config` file and one or more page files. The project must include `index.oru`.

```text
site/
├── oru.config
├── index.oru
├── about.oru
├── assets/
│   └── logo.png
└── pages/
    └── help.oru
```

## Project configuration

`oru.config` currently requires one field:

```text
name: "My Website"
```

## Metadata

Metadata is optional and appears before `page:`.

```oru
metadata:
    title: "My website"
    description: "A small website made with ORU."
    language: "en"
```

Supported fields are `title`, `description`, and `language`. Unknown fields are errors.

## Input bindings and constraints

Use `input("Email address")` for a placeholder-only input, or `input(email)` to bind the input value to a declared string variable. Use `textarea(message)` for multiline text bound to a declared string variable; it accepts `placeholder`, `label`, `rows`, `height`, `required`, `disabled`, `readOnly`, `minLength`, `maxLength`, and `name`. Set `label: "Email address"` to provide a stable accessible name that does not change as the user types. The binding updates as the user types without interrupting focus. Supported native properties include `type`, `required`, `disabled`, `readOnly`, `min`, `max`, `step`, `minLength`, `maxLength`, `pattern`, `autocomplete`, and `name`; `constraint: letters` and `constraint: numbers` apply matching browser patterns. Set `validationMessage: "Please enter a valid value."` to replace the browser's default message when that input fails native validation; the custom message clears when the user edits the field. Use `type: password` for a sensitive input; password inputs must use page-local state rather than cross-page global state.

Wrap related inputs in a `form:` widget and declare `on.submit: functionName` on the form. Buttons inside a form submit it by default. The browser runs native constraint validation first; if validation succeeds, ORU prevents a page reload and calls the named function. Invalid forms do not call the handler. Form submission does not send data to a server automatically.

```oru
logic:
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
```

## Page-local style classes

Define a class with `class name:` before the logic and page blocks. Give it indented style properties, then apply it to a widget with `class: name`. Widget properties override class defaults. The compiler rejects unknown classes and style properties that do not match the widget type. Import a named class with `from theme import navText`, or import a namespace with `import theme` and apply `class: theme.navText`. Module paths are resolved relative to the importing page file. Imported modules are other `.oru` page files; circular imports and name collisions are rejected.

## Page logic and events

A page may define one `logic:` block after optional metadata and before `page:`. It uses the normal ORU language syntax. Functions in this block are available to that page's event handlers.

```oru
metadata:
    title: "Counter"

logic:
    state count = 0
    func increment():
        count = count + 1

page:
    column:
        text(count)
        button("Add"):
            on.click: increment
```

Use `state name = value` for page-local state. Bind a `text` or `button` label with an unquoted variable name, such as `text(count)`. Top-level plain values imported from modules can also be displayed; changing a value in an event handler triggers a full page redraw. After a click handler completes, the page redraws using the latest variable values. This initial binding supports a single variable name, not arbitrary expressions.

Use `global name = value` for values shared by pages. ORU keeps these values in the current browser tab session and restores them when another page loads. Page-local `state` variables are not shared and start from their initial values on each page load.

## Widget tree

The page body is a nested widget tree. Four spaces represent one nesting level.

```oru
page:
    column:
        text("Welcome"):
            color: #222222
            size: 32
        row:
            box:
                width: 100%
                background: #eeeeee
                text("A panel")
            button("Continue")
        image("assets/logo.png", "ORU logo")
        input("Email address"):
```

Buttons support `on.click`, `on.hover`, `on.active`, and `on.leave` handlers. State-specific colors can be set with `hover.background`, `active.background`, `disabled.background`, and their matching `.color` properties. Use `disabled: true` to disable a button. A button can show an icon from `assets/` with `icon: "assets/arrow.png"` and an accessible `alt` label.

```oru
logic:
    func showHint():
        print("Continue is ready")
page:
    button("Continue"):
        hover.background: #dddddd
        active.background: #bbbbbb
        on.hover: showHint
```

Initial widgets: `column`, `row`, `box`, `form`, `text`, `button`, `link`, `image`, `input`, `textarea`, and `select`. A select is bound to a declared string state variable and contains `option("Visible label")` children. An option may set a distinct `value:` property. Selection updates the bound state; `required` and `disabled` use native browser behavior. Set `placeholder: "Choose one"` to add an initially unselected prompt option, allowing native `required` validation to work correctly.

Widget properties use `:`, not `=`. Values currently parse as strings, numbers, or booleans. Color values and size units remain strings for the renderer.

Image sources must be regular files inside `assets/` or HTTPS URLs. The compiler rejects path traversal, missing local files, HTTP/data/file URLs, and symbolic links in the assets tree. HTTPS images are fetched directly by the visitor's browser.

## Reusable style classes and imports

Declare a reusable page-local style class before `logic:` and `page:`:

```oru
class navText:
    color: #222222
    size: 20

page:
    text("Welcome"):
        class: navText
```

Direct widget properties override class defaults. Share classes from another `.oru` file with a named import or namespace import:

```oru
from theme import navText
# or: import theme

page:
    text("Welcome"):
        class: navText
```

With `import theme`, refer to the class as `theme.navText`. Module paths resolve relative to the importing page. Imported files are `.oru` pages, so they also contain a `page:` block. Circular imports, missing modules/classes, and class-name collisions are build errors. Named imports can also bring top-level functions and plain values from a module's `logic:` block: `from utils import greet, APP_NAME`. A module export is a top-level `func name(...):` or `name = value`. Imported declarations are added before the importing page's logic. Page-local `state`/`global` declarations and executable top-level statements are not exported. Namespace imports remain style-class-only in this release.

For example, a `utils.oru` module can expose logic:

```oru
logic:
    APP_NAME = "ORU"
    func greet(name):
        return "Hello " + name
page:
    text("Shared helpers")
```

A page can import those names explicitly:

```oru
from utils import greet, APP_NAME
logic:
    state greeting = greet(APP_NAME)
page:
    text(greeting)
```

## Links

Links use a label and an extensionless project-relative route:

```oru
page:
    link("Read more", "pages/help"):
```

Route mapping:
- `index.oru` → `/`
- `about.oru` → `/about`
- `pages/help.oru` → `/pages/help`

The development server resolves extensionless routes and supports nested pages.

## Build and preview

From the project root:

```sh
oru run dev
oru build
```

The build writes static HTML files into `dist/` and copies an optional `assets/` directory. Nested routes are emitted as `route/index.html` so they work with static hosts that serve directory indexes.

## Runtime status and limitations

The development compiler emits a browser page shell with a Canvas 2D renderer and a parallel semantic DOM layer for focusable controls. The renderer handles text, box, column, row, image, link, button, and input presentation. Text can expose heading semantics with `role: heading` and `level: 1` through `6`. Forms accept a `label:` property; inputs accept a stable `label:`; icon-only buttons accept `alt:`. Rows switch to a vertical layout below 560px by default (customize with `wrapAt`). The page canvas grows with its content so longer pages can scroll. A visually hidden semantic text/image tree and native DOM controls support screen readers and keyboard interaction; this is not yet full WCAG conformance. Page-local `logic:` blocks run through the ORU interpreter, and button `on.click` handlers invoke named ORU functions.

This is an early runtime, not the finished ORU 1.0 release. The compiler supports reusable page-local style classes and cross-file style-class imports. File inputs, async and cross-field validation, advanced responsive layout controls, full WCAG conformance, and comprehensive security/browser testing remain unfinished. Do not use it for production applications yet.

## Reactive page-local state

The page logic block supports page-local state declarations using `state name = value`. Bind a text or button widget to a state variable by passing the identifier without quotes, for example `text(count)` or `button(count)`. After a click handler updates the state, bound widgets are redrawn automatically.

```oru
logic:
    state count = 0
    func increment():
        count = count + 1
page:
    column:
        text("Count:")
        text(count)
        button("Add"):
            on.click: increment
```

State belongs to one page instance. Use `global name = value` for a value shared by pages in the same browser tab session. The runtime restores these values on navigation and saves them after click handlers. This is session-only, not durable storage. Richer binding expressions and dependency-level redraw optimization are not yet implemented.