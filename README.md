# ORU

**A simpler way to build for the web.**

ORU is a programming language for building websites and browser applications. Write readable `.oru` files and run them with the ORU CLI.

> **Current release: 0.9.1** — the first public release of the new ORU language and browser runtime. It is a pre-1.0 release; expect rough edges and breaking changes as the language matures. The earlier 0.3.0 release is available as a separate historical version.

## Install

Requirements: Node.js 20 or newer.

```sh
npm install --global @ashbornxd/oru@0.9.0
```

Create and run a project:

```sh
oru create my-website
cd my-website
oru run dev
```

Open the local address printed by the CLI (usually `http://localhost:3000`). Create a production build with:

```sh
oru build
```

The generated static site is written to `dist/` and can be hosted on a static web host. An optional project `assets/` directory is copied into the output.

## Quick example

Project structure:

```text
my-website/
├── oru.config
├── index.oru
└── pages/
    └── help.oru
```

`oru.config`:

```text
name: "My Website"
```

`index.oru`:

```oru
metadata:
    title: "My website"
    description: "Made with ORU."
    language: "en"

page:
    column:
        text("Hello, web!"):
            size: 32
        link("Get help", "pages/help")
```

Each `.oru` file defines one page. `index.oru` maps to `/`; `pages/help.oru` maps to `/pages/help`.

## What's included

- Python-inspired language core: values, variables, expressions, functions, conditionals, loops, and built-ins.
- Project CLI for creating projects, running a local development server, evaluating scripts, and building static output.
- Multi-page projects, routes, assets, module imports, and reusable style classes.
- Canvas-based browser rendering with semantic content and native keyboard-operable controls.
- Page-local state, session-scoped global state, reactive bindings, events, and async execution.
- Native forms, inputs, textareas, selects, file selection, and browser validation.
- Responsive layouts and baseline security protections, including path validation and content security policies.

File selection currently exposes filenames only; it does not upload file contents. Forms do not submit data to a server automatically.

## Documentation

- [Syntax reference](docs/syntax-reference.md) — language, page, widget, layout, event, form, import, and CLI syntax.
- [Language core](docs/core-language.md)
- [Page files and browser runtime](docs/page-files.md)
- [Async execution](docs/async-execution.md)
- [Examples and interactive showcase](examples/showcase/README.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Try the showcase from source

```sh
git clone https://github.com/ashbornxd/oru.git
cd oru
npm install
npm run build
cd examples/showcase
node ../../dist/cli.js run dev
```

The showcase includes a multi-page site covering language features, imports, state, async handlers, layouts, forms, validation, assets, and routes. Its form is local-only and does not send data.

## Feedback and bug reports

ORU 0.9.0 is an early public release. Please report reproducible bugs, confusing behavior, and documentation gaps through the [GitHub issue tracker](https://github.com/ashbornxd/oru/issues). Include your Node.js version, operating system, a minimal `.oru` example, and the exact error or unexpected result. Do not include secrets or private user data.

## Development

```sh
npm install
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser
```

## License

MIT. See [LICENSE](LICENSE).
