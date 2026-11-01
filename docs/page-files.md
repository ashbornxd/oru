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

The development compiler emits a browser page shell with a Canvas 2D renderer and a parallel semantic DOM layer for focusable controls. The initial renderer handles basic text, box, column, row, image, link, button, and input presentation.

This is an early vertical slice, not the finished ORU 1.0 runtime. Custom function event handlers, reactive state, imports, reusable style classes, form submission/validation, advanced responsive layout, and full keyboard/assistive-technology behavior are not complete yet. Do not use it for production applications until those features and the security/browser test suites are finished.
