# ORU page files (1.0 development)

Each `.oru` page file defines exactly one page. A project may contain multiple page files.

```text
site/
├── oru.config
├── index.oru
├── about.oru
└── pages/
    └── help.oru
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
            button("Continue"):
                on.click: continueAction
```

Initial widget names: `column`, `row`, `box`, `text`, `button`, `link`, `image`, and `input`.

Widget properties use `:`, not `=`. Values currently parse as strings, numbers, or booleans. Color values and CSS-like units remain strings for the renderer.

## Links

Links use a label and an extensionless project-relative route:

```oru
page:
    link("Read more", "pages/help"):
```

The route resolver and browser navigation runtime are still being implemented.

## Current parser boundary

The development page parser validates one page file, metadata, indentation, nested widgets, and widget properties. It does not yet compile the page tree into the Canvas runtime. Event handlers, class imports, expression binding, responsive layout, and rendering are later milestones. Use `oru eval script.oru` for the separate general-purpose language core today.
