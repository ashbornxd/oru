# ORU 1.0 Showcase

A runnable, multi-page test website that exercises the ORU 1.0 page compiler, browser runtime, language core, modules, and native controls.

## Run locally

From the root of the ORU repository:

```sh
npm install
npm run build
cd examples/showcase
node ../../dist/cli.js run dev
```

Open http://localhost:3000.

To create a static build instead:

```sh
node ../../dist/cli.js build
```

The generated site is written to `examples/showcase/dist/`.

## What to test

- Home: imported values and functions, named style imports, session-persistent global state, async event handlers, local SVG assets, and internal routes.
- Language lab: namespace style imports, functions, lists, objects, `range`, `len`, `for`, `while`, `if`, `continue`, `break`, and async imported functions.
- Contact: native email validation, required fields, select options, textarea constraints, accessible validation summary, and native file selection.
- All pages: responsive rows, container alignment, reusable style classes, semantic controls, keyboard focus, and route navigation.

The contact form is a local demonstration only. It does not send or upload data. File selection exposes filenames only; it does not read or upload file contents.
