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

## Page logic and events

A page may define one `logic:` block after optional metadata and before `page:`. It uses the normal ORU language syntax. Functions in this block are available to that page's event handlers.

```oru
metadata:
    title: "Counter"

logic:
    count = 0
    func increment():
        count = count + 1
        print(count)

page:
    column:
        text("Counter")
        button("Add"):
            on.click: increment
```

Use `on.click: functionName` on a button to call a page-local function. The current runtime executes the function and supports its language-side output. Reactive binding of values into widget text, full state subscriptions, and persistent storage are still under development.

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

## Page logic and click handlers

A page may include one `logic:` block between metadata and `page:`. Its contents use the general ORU language syntax. Functions declared there are available to that page's controls.

```oru
logic:
    func continueAction():
        print("Continue was selected")

page:
    button("Continue"):
        on.click: continueAction
```

A button's `on.click` property names a function in the same page. The function runs in the browser through the ORU interpreter. The current handler bridge supports function calls and console output; it does not yet provide reactive UI bindings or persistent state.

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

This is an early vertical slice, not the finished ORU 1.0 runtime. Reactive state and UI bindings, global state, imports, reusable style classes, form submission/validation, advanced responsive layout, and full keyboard/assistive-technology behavior are not complete yet. Do not use it for production applications until those features and the security/browser test suites are finished.
