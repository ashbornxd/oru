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

Use `state name = value` for page-local state. Bind a `text` or `button` label with an unquoted variable name, such as `text(count)`. After a click handler completes, the page redraws using the latest variable values. This initial binding supports a single variable name, not arbitrary expressions.

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

Initial widgets: `column`, `row`, `box`, `text`, `button`, `link`, `image`, and `input`.

Widget properties use `:`, not `=`. Values currently parse as strings, numbers, or booleans. Color values and size units remain strings for the renderer.

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

The development compiler emits a browser page shell with a Canvas 2D renderer and a parallel semantic DOM layer for focusable controls. The initial renderer handles basic text, box, column, row, image, link, button, and input presentation. Page-local `logic:` blocks run through the ORU interpreter, and button `on.click` handlers invoke named ORU functions.

This is an early runtime, not the finished ORU 1.0 release. The compiler supports reusable page-local style classes and cross-file style-class imports. General-purpose function/value imports, full form submission and validation, advanced responsive layout, complete keyboard and assistive-technology behavior, and comprehensive security/browser testing remain unfinished. Do not use it for production applications yet.

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