# ORU

**A simpler way to build for the web.**

ORU is a small, Python-inspired language for creating websites. Write your site in one readable `main.oru` file; ORU compiles it into standard web files.

> ORU is an early release. Syntax and compiler behavior may change before 1.0.

## Requirements

- Node.js 20 or newer
- npm

## Install

Install the ORU command-line tool:

```sh
npm install --global @ashbornxd/oru
```

Check the installation:

```sh
oru --version
oru --help
```

## Create a project

```sh
oru create myWeb
cd myWeb
```

A new project contains just one file:

```text
myWeb/
└── main.oru
```

## Develop

```sh
oru run dev
```

Open http://localhost:3000. The development server rebuilds when `main.oru` changes.

## Build for production

```sh
oru build
```

ORU writes deployable HTML and copies an optional `assets/` directory into `dist/`. The generated folder is build output; it is not part of the source project.

To choose another output folder:

```sh
oru build --out public
```

Deploy the contents of `dist/` to any static web host. You do not need ORU installed on the hosting server.

## Commands

| Command | Purpose |
| --- | --- |
| `oru create <name>` | Create a project with one `main.oru` file |
| `oru run dev` | Start the local development server |
| `oru build` | Create production-ready static files |
| `oru --version` | Show the installed version |
| `oru --help` | Show command help |

## Language example

```oru
title = "My first website"
description = "Made with ORU."

page index:
    section:
        padding = 40px
        text-align = center

        heading("Hello, web!"):
            font-size = 40px

        text("I built this with ORU.")

page about:
    section:
        heading("About")
        text("A second page, in the same file.")
```

## Current features

- Multiple pages in one `.oru` file
- Reusable style classes
- Readable, indentation-based syntax
- Common semantic elements and inline styles
- Static HTML output
- Local development server
- Optional local assets

## Contributing

To work on the ORU compiler itself:

```sh
git clone https://github.com/ashbornxd/oru.git
cd oru
npm install
npm test
npm run build
```

## License

MIT. See [LICENSE](LICENSE).
