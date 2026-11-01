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
- The `oru eval <file>` script command

## Browser runtime status

The 1.0 development branch now has a page compiler and Canvas 2D browser renderer, with text, layout, image, link, button, native form controls, and file selection plus a semantic DOM control layer. Page-local logic, click handlers, reactive text/button/input bindings, session-scoped `global` values, native form submission and constraints, button hover/active/disabled states and icon assets, reusable style classes, and named cross-file function/value imports are implemented. The Canvas renderer supports responsive row wrapping, scrollable content, and a semantic accessibility layer with native keyboard-operable controls. The compiler also rejects unresolved internal routes, unsafe module paths, unsafe image sources, and symbolic links in project assets.

**ORU 1.0 is not feature-complete or production-ready yet.** The current development branch passes its unit tests, TypeScript build, and a Chromium integration test in GitHub Actions. File selection currently binds filenames only and does not upload file contents. Remaining work includes advanced responsive layout controls, async/cross-field validation, full WCAG conformance, a broader security review, and wider cross-browser/device/screen-reader testing.

## Documentation

- [Published 0.3 language basics](docs/language-basics.md)
- [1.0 language core](docs/core-language.md)
- [1.0 page files and browser runtime](docs/page-files.md)
- [1.0 planning and implementation log](UPDATE.md)

## Contributing

```sh
npm install
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

## License

MIT. See [LICENSE](LICENSE).
