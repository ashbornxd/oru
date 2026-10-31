# ORU

**A simpler way to build for the web.**

ORU is a Python-inspired language for creating websites and web applications. It uses readable, indented syntax and compiles to ordinary HTML, CSS, and JavaScript.

> ORU is an early prototype. Syntax and compiler behavior may change before 1.0.

## Requirements

- Node.js 20 or newer
- npm

## Get started

```sh
git clone https://github.com/ashbornxd/oru.git
cd oru
npm install
npm run dev
```

Open http://localhost:3000.

## Build a website

Edit `main.oru`:

```python
title = "My first website"
description = "Made with ORU."

page index:
    section:
        padding = 40px
        text-align = center

        heading("Hello, web!"):
            font-size = 40px

        text("I built this with ORU.")
```

Build it:

```sh
npm run compile
```

The generated website is written to `dist/`.

## CLI

After building the package, use the CLI:

- `oru build [file.oru]` — compile a website.
- `oru dev [file.oru]` — compile and start a local development server.
- `oru build main.oru --out public` — choose an output directory.

## Current language features

- Project title and description
- Multiple pages (`page index:`, `page about:`)
- Reusable style classes (`class Card:`, then `Card:`)
- Sections, containers, rows, and columns
- Headings, text, images, buttons, links, and inputs
- Inline styling with readable property names
- Responsive base layout styles

## Project structure

```text
oru/
├── src/
│   ├── ast.ts
│   ├── parser.ts
│   ├── compiler.ts
│   └── cli.ts
├── examples/
├── main.oru
└── package.json
```

## License

MIT
