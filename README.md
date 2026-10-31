# ORU

**A simpler way to build for the web.**

ORU is a Python-inspired language for building websites. Describe pages, content, layouts, and styles in readable `.oru` files. ORU compiles them into standard web files.

> ORU 0.3 is an early language redesign. Syntax and compiler behavior may still change before 1.0.

## Requirements

- Node.js 20 or newer
- npm

## Install

```sh
npm install --global @ashbornxd/oru
oru --version
```

## Create and run a project

```sh
oru create myWebsite
cd myWebsite
oru run dev
```

Open http://localhost:3000.

## Build

```sh
oru build
```

ORU writes static files to `dist/` and copies an optional `assets/` folder. Deploy `dist/` to any static web host.

## Language example

```oru
title = "My website"
description = "Made with ORU."

page index:
    section:
        section.padding = 32
        section.align = center

        heading("Hello, web!"):
            heading.size = 44
            heading.color = "#182230"

        text("A website written in ORU."):
            text.size = 18
            text.color = "#596579"

        button("Explore", "go about"):
            button.background = "#2457d6"
            button.color = white
            button.radius = 12

page about:
    section:
        heading("About")
        text("Another page, in the same file.")
```

## What ORU provides

- Multiple pages in one source file
- Semantic elements and reusable style classes
- Element-scoped styling such as `text.color` and `button.radius`
- Simple vertical stacks and auto-fitting grids
- Responsive defaults for phones, tablets, and desktops
- Static HTML output and a local development server
- Optional local assets

## Documentation

Read [Language basics](docs/language-basics.md) for the current syntax and supported elements.

## Contributing

```sh
git clone https://github.com/ashbornxd/oru.git
cd oru
npm install
npm test
npm run build
```

## License

MIT. See [LICENSE](LICENSE).
