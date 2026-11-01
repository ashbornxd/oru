# ORU

**A simpler way to build for the web.**

ORU is a Python-inspired programming language for websites and browser applications. Its source files use the `.oru` extension.

> **Release status:** ORU 0.3.0 is the published npm release. ORU 1.0 is being developed on `oru-1.0.0-dev` and is not published.

## Published release (0.3.0)

Install the stable published version:

```sh
npm install --global @ashbornxd/oru@0.3.0
```

The 0.3 syntax and behavior are documented in [language basics](docs/language-basics.md).

## ORU 1.0 development build

Requirements: Node.js 20+ and npm.

```sh
git clone --branch oru-1.0.0-dev https://github.com/ashbornxd/oru.git
cd oru
npm install
npm test
npm run build
npm link
```

Create and preview a 1.0 project:

```sh
oru create myWebsite
cd myWebsite
oru run dev
```

Open `http://localhost:3000`. Build static output with `oru build`; files are written to `dist/`. An optional `assets/` directory is copied into the output.

## Complete interactive showcase

A multi-page test website is included at [`examples/showcase/`](examples/showcase/README.md). It exercises the language core, page compiler, browser runtime, modules, async handlers, global state, style classes, responsive layouts, native forms, validation, file selection, assets, and routes.

Run it from the repository root:

```sh
npm install
npm run build
cd examples/showcase
node ../../dist/cli.js run dev
```

Open `http://localhost:3000`. The showcase README lists what to test. Its form is local-only and does not send data.

## 1.0 page example

Project structure:

```text
myWebsite/
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
        link("Get help", "pages/help"):
```

Each `.oru` file defines one page. `index.oru` maps to `/`; `pages/help.oru` maps to `/pages/help`.

## Language core

The 1.0 interpreter currently includes:

- Strings, numbers, booleans, lists, and dictionary/object values
- Inferred, type-stable variables and uninitialized declarations
- Arithmetic, comparisons, and logical expressions
- Functions, lexical closures, conditionals, and loops
- `print`, `len`, and `range` built-ins
- The `oru eval <file>` script command (async-aware in 1.0)

## Browser runtime status

The 1.0 development branch has a page compiler and Canvas 2D browser renderer, with text, layout, image, link, button, native form controls, and file selection plus a semantic DOM control layer. Page-local logic, click handlers, reactive text/button/input bindings, session-scoped `global` values, native form submission and constraints, cross-field input matching, accessible validation summaries, button hover/active/disabled states and icon assets, reusable style classes, and named cross-file function/value imports are implemented. The renderer supports responsive row wrapping, main/cross-axis container alignment, scrollable content, semantic content, and native keyboard-operable controls. The compiler rejects unresolved internal routes, unsafe module paths, unsafe image sources, and symbolic links in project assets. Playwright browser integration tests target Chromium, Firefox, and WebKit, including desktop/mobile layout checks.

**ORU 1.0 feature implementation is complete on the development branch, but it is not yet approved for production.** The current branch passes unit tests, the TypeScript build, package validation, security dependency audit, and Playwright integration tests in Chromium, Firefox, and WebKit on Node.js 20, 22, and 24. The suite covers native file selection, form validation, strict CSP enforcement, responsive layout, keyboard navigation, and visible focus. File selection currently binds filenames only; it does not upload file contents. Async compatibility tests now cover mixed sync/async calls, nested awaits, evaluation order, short-circuiting, state restoration, and asynchronous function imports. Release gates still include full WCAG conformance and assistive-technology testing, independent security/performance review, and real-device testing. Generated pages use per-document SHA-256 CSP hashes; inline scripts, event-handler attributes, and style attributes are disabled.

## Documentation

- [Published 0.3 language basics](docs/language-basics.md)
- [1.0 language core](docs/core-language.md)
- [1.0 page files and browser runtime](docs/page-files.md)
- [1.0 planning and implementation log](UPDATE.md)
- [1.0 release verification checklist](docs/release-checklist.md)
- [Security policy](SECURITY.md)

## Contributing

```sh
npm install
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser
```

## License

MIT. See [LICENSE](LICENSE).
