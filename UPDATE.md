# ORU 1.0.0 — Planning Log

> Temporary planning document. Record every agreed product, language, runtime, tooling, and release decision here as soon as it is made. Use this document as the source of truth when designing and building ORU 1.0.0.

**Current published version:** 0.3.0  
**Target version:** 1.0.0  
**Status:** Active development; not release-ready. Implemented on `oru-1.0.0-dev`: the core interpreter, page parser, route builder, static project compiler, Canvas 2D runtime, page-local logic and click handlers, basic reactive bindings, session-scoped cross-page global state, reusable style classes, cross-file style-class imports, and native form submission with browser constraint validation. Still open: general-purpose function/value modules, advanced form controls, responsive layout, accessibility parity, asset/security hardening, and comprehensive browser integration testing.

## Vision

ORU 1.0.0 should be a dependable, approachable programming language for building and shipping real-world websites and web applications.

It should go beyond the current 0.3 prototype while keeping ORU's identity:
- Readable, Python-inspired syntax.
- A small, coherent language rather than a pile of unrelated shortcuts.
- A productive workflow from project creation to local development and production build.
- Generated websites that are accessible, responsive, secure by default, and maintainable.
- Clear errors, useful documentation, and predictable behavior.

The exact feature set and technical design are intentionally undecided until we plan them together.

## Planning principles

1. Agree on the user-facing behavior before choosing implementation details.
2. Prefer a coherent feature that works end to end over many incomplete features.
3. Keep syntax consistent and avoid unnecessary keywords or special cases.
4. Treat accessibility, security, performance, and maintainability as core requirements.
5. Keep the compiler, runtime, CLI, and project structure understandable and testable.
6. Document each accepted decision in this file before implementation begins.
7. Mark proposals as proposals; never silently turn an idea into a requirement.

## Current 0.3 baseline

These are observations about the existing implementation, not commitments for 1.0:

- .oru source files are parsed into a small AST and compiled to static HTML with embedded CSS and a small navigation script.
- The language currently supports project settings, multiple pages, a fixed set of elements, scoped style properties, and reusable wrapper classes.
- The CLI currently supports project creation, a local development server, and static builds.
- Button navigation currently handles the simple 'go ' action; there is no general application event or state system.
- Forms generate basic HTML markup but do not provide a server-side handler, database, or submission runtime.
- There is no established component/prop system, module/import system, package ecosystem, or official backend/runtime model.
- The parser and compiler are intentionally small and have limited language semantics and diagnostics.
- The build output cleanup and path handling need a security review before being considered production-ready.

## Decisions

Approved decisions are recorded below.

Add decisions below in chronological order. Include the date, the decision, its reasoning, and any consequences or follow-up work.

### Decision log

| Date | Area | Agreed decision | Reason / consequences |
| 2026-11-01 | Language design order | Design ORU's general-purpose programming fundamentals (types, variables, values, operators, and logic) before designing website/UI syntax. | ORU should be a real programming language, not just a markup language with styling syntax. |
| 2026-11-01 | Runtime target | ORU 1.0 applications must run in ordinary web browsers. A separate ORU desktop/mobile runtime is not required for 1.0. | Browser reach is the delivery target. The ORU runtime and renderer will execute within the browser, with compatibility across major browsers as a requirement. |
| 2026-11-01 | Renderer backend | Use Canvas 2D as the drawing backend for the ORU 1.0 renderer. | It provides a simpler foundation for a UI-focused renderer: text, shapes, images, layouts, and interactions. Keep the renderer architecture modular so a different backend, potentially WebGL, can be explored later if justified. |
| 2026-11-01 | Uninitialized variables | A variable declared with `pass` has no value until it is explicitly assigned. Reading it before assignment must produce a clear error. | Avoids silently inventing default values and makes missing data easier to detect. |
| 2026-11-01 | Variable type safety | Once a variable's type is established by its first non-`pass` value, it cannot be changed by assigning an incompatible value. | Prevents accidental type changes while allowing concise declarations without explicit type keywords. |
| 2026-11-01 | Assignment and configuration syntax | Use `:` for structured configuration fields (for example, `metadata:` with indented `title: "..."`) and `=` for variable declarations and assignments. A variable may be declared as `name = pass`; its type is inferred from the first value later assigned. | Separates configuration syntax from variable syntax and avoids requiring a type keyword when declaring an uninitialized variable. |
| 2026-11-01 | File and page model | Each `.oru` source file defines exactly one page. Each file can declare its own page metadata, including its title and description. | Gives each page a clear, independent source file and page-specific metadata. Multi-page projects are composed from multiple `.oru` files; routing and file-to-URL mapping remain to be designed. |
| 2026-11-01 | Application state | ORU 1.0 will include a built-in state system. | State will let interactions update application data and UI, such as changing button text to `Logging in...` after a click. Exact declaration syntax, update rules, reactivity, and lifecycle remain to be designed. |
| 2026-11-01 | State reactivity | State is automatically reactive: when a state value changes, every UI element that depends on it updates automatically. | Developers should not need to manually refresh or redraw dependent UI. The dependency tracking and update scheduling model remain to be designed. |
| 2026-11-01 | State scope | Support both page-local state and global state shared across pages. | Page-local state keeps isolated UI state close to its page; global state enables shared application data across pages. Exact declaration syntax, lifetime, persistence, and access rules remain to be designed. |
| 2026-11-01 | Class imports | ORU must support importing reusable classes from other source files/modules. | Allows style classes and other class definitions to be shared instead of duplicated. Exact import syntax, module boundaries, export rules, and supported class kinds remain to be designed. |

| 2026-11-01 | Core value types | ORU 1.0 will include `string`, `number`, `boolean`, and `list` as initial built-in value types. | Establishes a small, useful starting type system. Exact numeric behavior, list element typing, nested lists, and future types remain to be specified. |
| 2026-11-01 | Dictionary/object values | ORU 1.0 will support dictionary/object values that store structured data as key-value pairs. | Enables structured records such as users and settings. Exact literal syntax, key rules, typing, mutation, and whether dictionaries and objects are one concept or distinct concepts remain to be designed. |
| 2026-11-01 | Collection scope | Keep the initial ORU 1.0 collection types limited to lists and dictionaries/objects; tuples are not included in the 1.0 initial scope. | Keeps the first type system smaller and easier to learn. Additional collection types can be considered in a later version if real use cases justify them. |
| 2026-11-01 | User-defined functions | ORU 1.0 will support user-defined functions declared with the `func` keyword. | Gives developers reusable logic and a foundation for structuring applications. Function parameter syntax, return syntax, scope, overloads, and typing rules remain to be designed. |
| 2026-11-01 | Conditional logic | ORU 1.0 will support `if`, `elif`, and `else` conditional branches. | Enables programs to make decisions based on values and application state. Condition expression rules, block syntax, truthiness, and type requirements remain to be designed. |
| 2026-11-01 | Loops | ORU 1.0 will support both `for` loops and `while` loops. | `for` supports iteration over collections or ranges; `while` repeats while a condition holds. Exact syntax, range support, iteration behavior, and loop control (`break`/`continue`) remain to be designed. |
| 2026-11-01 | Loop control | ORU 1.0 will support `break` and `continue` inside loops. | `break` exits the nearest enclosing loop; `continue` skips to the next iteration of the nearest enclosing loop. Use outside a loop must be a compile-time error. |
| 2026-11-01 | Collection type scope | Keep the initial collection types to `list` and dictionary/object values; tuples are out of scope for ORU 1.0's initial type set. | Keeps the type system focused and avoids adding another collection model before real use cases justify it. Tuples can be reconsidered in a later version. |
| 2026-11-01 | Collection scope | Keep `list` and dictionary/object as the only built-in collection types planned for ORU 1.0; do not add tuples as a separate built-in type for this release. | Keeps the initial type system focused. Additional collection types can be considered in a later version if real use cases justify them. |
| 2026-11-01 | Collection type scope | Keep the initial collection types limited to lists and dictionary/object values. Tuples are not included in ORU 1.0. | Keeps the initial type system focused; additional collection types can be considered in a later version if there is a clear need. |
| 2026-11-01 | Collection scope | Keep the initial collection types limited to lists and dictionary/object values; tuples are out of scope for ORU 1.0. | Keeps the initial type system focused and avoids adding another collection model before real use cases require it. |

## Open planning areas

Work through these together. An item is not a decision until we explicitly agree on it.

### 1. Product scope
- What kinds of websites and web applications should 1.0 support?
- What should be possible entirely in ORU, and where should developers be able to use existing web technologies?
- What is explicitly out of scope for 1.0?

### 2. Language design
- **Agreed priority:** Design general-purpose programming fundamentals (types, variables, values, operators, and logic) before website/UI syntax.
- **Agreed syntax distinction:** Use `:` for structured configuration fields and `=` for variable declarations and assignments. Example configuration shape: `metadata:` followed by indented fields such as `title: "..."` and `description: "..."`.
- **Agreed variable behavior:** `name = pass` declares an uninitialized variable. Its type is inferred from the first non-`pass` value assigned to it. Later assignments must match that established type; incompatible assignments produce an error. Reading the variable before its first value is assigned produces an error.
- **Agreed file/page model:** Each `.oru` file contains exactly one page, and each page file can define its own metadata such as title and description.
- **Agreed page references:** Refer to a page using its relative file path without the `.oru` extension: `index`, `help`, or `pages/help`.
- **Agreed UI composition direction:** Build page content with a nested, declarative widget tree inspired by Flutter, but with ORU's own syntax and API.
- **Agreed:** Core widgets such as `column`, `row`, `box`, and `text` are built into ORU and available directly.
- **Agreed:** Developers can define reusable named style classes (for example, `class navText:`) and apply them to widgets. Exact syntax and behavior remain to be designed.
- **Agreed:** Developers can define reusable named style classes (for example, `class navText:`) and apply them to compatible widgets. Exact semantics and syntax remain to be designed.
- **Agreed:** Developers can define reusable named style classes and apply them to widgets. The exact syntax and style precedence remain open.
- **Agreed comment syntax direction:** Use triple double quotes (`\"\"\" ... \"\"\"`) for comments. Exact placement and multiline parsing rules remain open.
- **Illustrative syntax proposal (not a complete specification):** The user's example establishes the intended feel: `page:` contains layout widgets such as `column` and `row`; widgets may have optional names; properties are indented under widgets; text and links can be nested; and triple-quoted notes can appear inline to explain behavior.
- **Still to design:** Exact navigation syntax and URL mapping; widget/property grammar; asset path syntax; class/style definitions; units and color literal rules; and the behavior/semantics of `anchor`.
- **Illustrative example:** `name = pass`, then `name = "kunal"` establishes it as a string; `name = 20` afterward is a type error.
- **Superseded proposal:** Explicit declarations such as `string name = pass` are no longer the chosen variable syntax.
- **Agreed initial built-in types:** `string`, `number`, `boolean`, and `list`. ORU 1.0 will also support dictionary/object values for key-value structured data. Lists and dictionary/object values are the only planned collection types for 1.0; tuples are out of scope. Exact numeric behavior, list element typing, nested lists, dictionary/object literal syntax, key rules, typing, mutation, and whether dictionaries and objects are one concept or distinct concepts remain to be specified.
- **Still to design:** Inference details, operators, expressions, functions, control flow, input conversion, and error timing. Do not assume Python's existing `pass` semantics.
- **Agreed:** User-defined functions use the `func` keyword. Their parameter and return syntax, scope, and typing rules remain to be designed.
- **Agreed:** Conditional logic uses `if`, `elif`, and `else`. Condition evaluation and block semantics remain to be designed.
- **Agreed:** Include both `for` and `while` loops. Their exact syntax and iteration rules remain to be designed.
- **Agreed:** Include `break` and `continue` for loop control. They apply to the nearest enclosing loop and are errors outside loops.
- Core syntax, values, expressions, variables, functions, control flow, and errors.
- **Agreed file/page model:** One `.oru` file defines one page; each file has its own metadata such as title and description. The rules for routing and mapping filenames to URLs remain open.
- Pages, reusable components, properties/arguments, slots or composition.
- Styling model, responsive behavior, themes, and custom CSS escape hatches.
- **Agreed:** ORU must support importing reusable classes from other source files/modules. This includes sharing named classes such as reusable style classes; exact syntax, export rules, module boundaries, and class kinds remain to be designed.
- Imports, project organization, and code reuse.

### 3. Application capabilities
- **Agreed direction:** Support UI events and interaction states, including button click, hover, active, and disabled states. Buttons may contain text or images.
- **Agreed direction:** Provide form and input widgets for ordinary text and sensitive values such as passwords, with configurable constraints such as letters-only or numbers-only. Password inputs conceal entered characters; actual secure handling and validation rules must be designed explicitly.
- **Agreed:** ORU 1.0 will have a built-in state system so interactions can update application data and UI (for example, changing a button label to `Logging in...` after it is clicked). State declaration syntax, update semantics, reactivity, and lifecycle are still open.
- **Agreed:** State is automatically reactive. When a state value changes, all UI elements that depend on it update automatically; developers do not manually refresh the UI. Dependency tracking and update scheduling remain to be designed.
- **Agreed:** Support both page-local state and global state shared across pages. Declaration syntax, lifetime, persistence, and access rules remain to be designed.
- User interaction, event syntax, forms, validation, and client-side state.
- Data fetching, APIs, authentication integration, and server-side capabilities.
- Routing, navigation, loading/error states, and application lifecycle.
- Accessibility and internationalization.

### 4. Runtime and architecture
- **Agreed:** ORU 1.0 applications target ordinary web browsers, with compatibility across major browsers as a requirement. A separate non-browser runtime is not a 1.0 requirement.
- **Agreed direction:** ORU should own its UI rendering model instead of translating its interface into HTML/CSS layouts. Its renderer will run inside the browser.
- **Agreed:** Use Canvas 2D as the initial drawing backend. Keep the renderer modular so another backend can be considered later if real performance or capability needs justify it.
- **Not decided:** The exact browser support matrix and how ORU will expose browser capabilities.
- Compiler output and browser runtime responsibilities.
- Whether ORU is static-only, full-stack, or supports a clearly defined combination.
- Build targets, development server, production server/hosting expectations.
- Interoperability with JavaScript, CSS, HTML, and existing packages.

### 5. Developer experience
- Project templates and folder structure.
- CLI commands, configuration, environment variables, and asset handling.
- Formatting, linting, type checking, testing, debugging, and editor support.
- Error messages, diagnostics, documentation, and migration from 0.3.

### 6. Quality and release requirements
- Security model and safe defaults.
- Performance budgets and generated output quality.
- Browser/device support and accessibility requirements.
- Test strategy, compatibility guarantees, semantic versioning, and release checklist.

## Milestones

Milestones are provisional planning stages, not promises or fixed dates.

1. **Vision and scope** — define the target user, use cases, and 1.0 boundaries.
2. **Language specification** — agree on syntax and semantics before implementation.
3. **Architecture** — choose compiler, runtime, project model, and interoperability approach.
4. **Feature design** — specify each accepted feature and its behavior.
5. **Implementation plan** — break the spec into testable stages.
6. **Build and validation** — implement, test, document, and try real projects.
7. **Release readiness** — security, performance, compatibility, migration, and npm release checks.

## Rules for updating this file

- After every planning decision we agree on, update the decision log and the relevant planning section in the same working session.
- Keep unresolved alternatives under the relevant open planning area; do not present them as settled.
- If a decision changes, record the new decision and mark the old one as superseded instead of erasing history.
- Before implementing ORU 1.0.0, review this file and turn the approved decisions into a formal language specification and implementation roadmap.
- Once ORU 1.0.0 ships, remove this temporary file or archive its final decisions into permanent project documentation.


## Implementation progress

### Milestone 1 — Language core foundation

**Implemented on `oru-1.0.0-dev` (initial development slice):**
- Indentation-aware statement parsing and expression parsing.
- String, number, boolean, list, and dictionary/object literals.
- Inferred variable types, uninitialized `pass`, and incompatible reassignment errors.
- Arithmetic, comparison, and logical expressions.
- Functions with parameters, return values, and lexical closures.
- `if`, `elif`, `else`, `for`, `while`, `break`, and `continue`.
- List/string iteration, object property access, and collection indexing.
- Initial `print`, `len`, and `range` built-ins.
- Execution limits and initial automated tests.

**Not yet implemented:** module/import loading, page-file semantics, global and page-local reactive state, widgets, Canvas 2D rendering, browser event handling, form validation/security, browser interoperability, CLI execution of general-purpose scripts, and production diagnostics.

### Provisional implementation semantics

These details are implemented as the first coherent baseline, but remain open to review and refinement:
- Use four spaces per indentation level; tabs and inconsistent indentation are errors.
- Use `true` and `false` for booleans; `pass` represents an uninitialized variable declaration.
- Initial operators: arithmetic (`+`, `-`, `*`, `/`, `//`, `%`, `**`), comparisons, and logical (`and`, `or`, `not`, `!`).
- `+` adds numbers or joins strings; arithmetic operators otherwise require numbers.
- Conditions treat `false`, `pass`, zero, and the empty string as false; other values are true.
- Functions use `func name(parameters):` and `return`; parameters are local and functions can read enclosing variables.
- `for` iterates lists and strings; `range` creates numeric lists.
- `break` exits the nearest loop; `continue` skips to its next iteration.
- Initial built-ins are `print`, `len`, and `range`.
- Execution is bounded by a configurable statement/iteration limit to prevent accidental runaway loops.
- Object/list mutation and assignment to nested properties or indexes are not implemented yet.


### Decisions made for the completion pass (2026-11-01)

| Area | Decision | Consequence |
|---|---|---|
| Project entry | A project contains `oru.config` and one or more `.oru` page files; `index.oru` is the default route. | The CLI discovers pages from the project root and maps relative paths to browser routes. |
| Route output | `index.oru` maps to `/`; `about.oru` maps to `/about`; `pages/help.oru` maps to `/pages/help`. | Page references use extensionless relative paths; route traversal and duplicate routes are build errors. |
| Page metadata | A page begins with `metadata:` and indented `title:`, `description:`, and optional `language:` fields, followed by `page:`. | Metadata is separated from the widget tree and emitted into the browser document shell. |
| UI tree | UI is declared under `page:` using nested `column`, `row`, `box`, and `text` widgets. | Widget/property parsing is distinct from general-purpose statements, sharing the same expression evaluator. |
| Styling | Widget properties use `property: value`; reusable style classes are named declarations and applied with `class: Name`. | Style values are validated against widget/property definitions and inherited only where explicitly supported. |
| Navigation | `link("route")` is a navigation widget; route names are extensionless project-relative paths. | The runtime handles internal navigation without a full page reload and supports browser back/forward. |
| Events | Event properties use `on.click: functionName`; event handlers are ordinary `func` functions. | Event dispatch calls the language runtime and schedules a reactive render. |
| State | `state name = value` declares page-local state; `global name = value` declares app-wide state. | State values are observable, type-stable, and persist for the current browser session; durable storage is not implicit. |
| Imports | `import module.path` imports a module; `from module.path import Name` imports named exports. | Imports resolve relative to the importing file, must stay inside the project, and cycles are rejected initially. |
| Renderer | ORU renders its own widget tree to Canvas 2D, with a hidden accessible DOM layer for keyboard, focus, and assistive technology support. | Canvas remains the visual backend without sacrificing basic browser accessibility. |
| Browser boundary | ORU exposes a small explicit browser API for navigation, clipboard, and network requests; raw arbitrary JavaScript execution is not a language feature. | Browser capabilities are permission- and context-aware rather than silently injected into every script. |
| Build model | ORU 1.0 is a client-side browser application compiler/runtime; server APIs and database hosting are outside the 1.0 compiler scope. | Applications may call external APIs, but secrets and privileged operations must remain on a separately secured backend. |
| Entry page | Every buildable project must contain `index.oru`, which maps to `/`. | Gives the dev server and static build a deterministic entry point. |


| Project configuration | `oru.config` is a required UTF-8 text file at the project root, with a single `name: "Project Name"` field for 1.0. | The CLI validates the project identity and reserves this file for future explicit settings; unknown fields are errors rather than silently ignored. |


| Page logic | A page may contain one optional `logic:` block between metadata and `page:`. Its indented contents use the general ORU language syntax. | The page's logic is initialized once when that page loads. |
| Click handlers | A button may declare `on.click: functionName`; the named function must be defined in that page's `logic:` block. | Activating the button calls the named ORU function through the interpreter. |
| Browser interpreter delivery | The build emits the ORU interpreter and its error module under `_oru/` and loads them as a local ES module. | Nested pages use relative module paths and do not depend on a remote runtime host. |


| Page-local state | Declare reactive page state inside `logic:` with `state name = value`; later assignments must retain the inferred type. | Each page has an isolated state environment created when its page runtime loads. |
| UI value binding | Use an unquoted identifier as a widget content argument, such as `text(count)` or `button(label)`, to bind displayed content to a page variable. Quoted arguments remain static text. | After a click handler completes, the renderer refreshes and reads current values from the interpreter. This initial binding form supports a single variable name, not arbitrary expressions. |


| Cross-page global state | Declare shared values with `global name = value` in a page's `logic:` block. A previously stored value takes precedence over the declaration's initial value. | Values are serialized for the current browser tab session and are shared across pages in that session; they are not durable application storage. |


| Local style classes | Use `class name:` for a reusable page style and `class: name` on a widget to apply it. Direct widget properties take precedence over class properties. | The first implementation supports page-local classes; sharing them between files is a later step. |


| Style class imports | Use `from module.path import className` for named style classes or `import module.path` to import a module namespace. Module paths resolve relative to the importing page file; a leading `../` moves to its parent directory. | A module is another `.oru` page file. Its declared style classes are available to import; import cycles and name collisions are build errors. Function imports are not part of this first class-import slice. |


| Input binding | `input(name)` binds an input to a page variable; `input("Placeholder")` remains a placeholder-only input. The bound variable must be a string-compatible page or global value. | The value is written back when the input changes, then bound UI content is refreshed. Native browser constraints cover required, minimum/maximum length, and letters/numbers patterns. |

### Completion roadmap

1. Harden the core interpreter: source locations, assignment/mutation, predictable scopes, diagnostics, and test coverage.
2. Implement project/page parsing, metadata, widget trees, style classes, and route validation.
3. Implement safe module resolution and exports.
4. Implement reactive local/global state and event dispatch.
5. Implement Canvas 2D layout, text, shapes, images, hit testing, navigation, and accessible DOM semantics.
6. Integrate the CLI project workflow, development server, production build, and asset handling.
7. Add documentation, examples, compatibility tests, security review, and release checklist.

These decisions define the implementation direction for this completion pass. Any syntax refinement must be recorded here before its implementation.


### Milestone 2 — Page-file parser foundation

Implemented on `oru-1.0.0-dev`:
- Added `src/project.ts`, a separate parser for one-page-per-file source.
- Parses optional `metadata:` fields (`title`, `description`, `language`) and a required `page:` block.
- Parses nested `column`, `row`, `box`, `text`, `button`, `link`, `image`, and `input` widgets.
- Parses widget properties using colon syntax and validates indentation, duplicate fields, and unknown widgets.
- Added parser tests in `src/project.test.ts` and syntax documentation in `docs/page-files.md`.
- Added the existing `oru eval` command to CLI help.

Remaining: route discovery, project configuration, imports, expression binding, page compilation, and Canvas runtime output. The parser is not yet a complete page compiler.


### Milestone 2 continued — Route mapping

Implemented on `oru-1.0.0-dev`:
- Added `src/routes.ts` to map `index.oru` to `/`, `about.oru` to `/about`, and nested pages to matching extensionless routes.
- Maps each route to a safe static output path and rejects absolute paths, traversal segments, invalid names, and non-`.oru` sources.
- Requires `index.oru` and rejects duplicate source paths or route collisions.
- Added route tests in `src/routes.test.ts`.


### Decisions for the first end-to-end browser runtime slice (2026-11-01)

| Area | Decision | Consequence |
|---|---|---|
| Browser output | Compile each page into a static HTML shell that loads an embedded ORU Canvas 2D runtime and serialized page tree. | No separate runtime download or bundler is required for the first release; generated output remains deployable as static files. |
| Layout model | Use deterministic vertical/horizontal flow for column/row, intrinsic sizing for text, and explicit width/height constraints where supplied. | The first renderer favors predictable responsive layouts over a full CSS-like layout engine. |
| Interaction model | Use Canvas hit regions for pointer activation and a parallel semantic DOM tree for keyboard and assistive-technology interaction. | Buttons, links, and inputs must remain operable without a pointer; the DOM layer mirrors the visual widget order. |
| Input safety | Treat all text as data, escape metadata and attributes, and never evaluate property strings as JavaScript. | Event names resolve only to registered ORU functions; arbitrary code injection through page values is not supported. |
| Navigation | Internal links use the History API and route table; browser back/forward re-renders the matching page. | Static hosting must provide a fallback to the generated entry shell for extensionless routes. |
| Initial renderer scope | Support column, row, box, text, button, link, image, and input widgets; unsupported advanced styling fails with a useful build error rather than silently pretending to work. | Forms, global reactive state, imported classes, and full expression binding remain subsequent integration milestones. |

The first runtime slice is deliberately a vertical end-to-end milestone, not the final 1.0 feature set. Any limitations discovered during implementation must be reflected in the docs and tests.


### Milestone 3 — First end-to-end page build and Canvas runtime

Implemented on `oru-1.0.0-dev`:
- Added `oru.config` validation with the initial `name: "Project Name"` format.
- Added recursive page discovery and multi-page project compilation.
- Connected `oru build` and `oru run dev` to the new page-file compiler.
- Added extensionless route output: root page to `index.html`, nested pages to route `index.html` files.
- Added a browser page shell with a Canvas 2D renderer for basic text, columns, rows, boxes, images, links, buttons, and inputs.
- Added a parallel semantic DOM control layer for focusable controls.
- Updated the starter project to use `oru.config` and `index.oru`.
- Added project compiler and page compiler tests; updated the 1.0 page documentation and README.
- Fixed leaf widget parsing so simple widgets such as `text("Hello")` do not require a trailing colon.

**Known limitations still open:** the renderer is a basic first slice. ORU-language event functions are not connected to controls; state and reactivity, module imports, reusable style classes, full form validation/submission, robust responsive layout, complete accessibility, asset URL hardening, and broad browser/security tests remain unfinished. The current UI should be treated as experimental.


### Milestone 4 — Page-local logic and click handlers

Implemented on `oru-1.0.0-dev`:
- Added an optional `logic:` block to page files; its contents are parsed as general ORU code.
- Exposed callable functions and live global snapshots from the core interpreter.
- Connected button `on.click: functionName` properties to functions declared in that page's logic block.
- Added local browser module imports for the ORU interpreter and its error type; the project build packages these files under `_oru/` only when page logic is used.
- Added tests for function invocation, page logic compilation, and nested-route interpreter paths.

**Still missing:** reactive state declarations and bindings, global state, modules/imports, reusable style-class semantics, full form handling, and complete renderer/accessibility/security validation. Calling a handler currently runs ORU code and can produce console output; changing a variable does not yet automatically update text or layout.


### Milestone 5 — Page-local state and simple reactive bindings

Implemented on `oru-1.0.0-dev`:
- Page logic supports `state name = value` declarations using the core interpreter's type-stable variable behavior.
- `text(name)` and `button(name)` accept an unquoted variable identifier as a content binding; quoted values remain static text.
- Button handlers trigger a page redraw after execution, and the renderer reads the current interpreter globals for bound content.
- Added parser and compiler tests for variable bindings and handler-driven updates.

**Scope boundary:** this is synchronous, page-local re-rendering after an event handler. Cross-page global state, arbitrary expression bindings, async updates, imports, and other 1.0 systems remain incomplete.

### Milestone 4 — Page-local state and event-driven rendering

Implemented on `oru-1.0.0-dev`:
- Page files may contain a `logic:` block between metadata and `page:`.
- Page-local state declarations use `state name = value` and are executed by the core interpreter.
- Button widgets support `on.click: functionName`; handlers invoke functions defined in the page logic block.
- Text and button widgets can bind displayed values with identifier arguments such as `text(count)` and `button(count)`.
- After a click handler runs, the Canvas renderer redraws bound values from the interpreter's current globals.
- The build includes the interpreter locally under `_oru/core.js`; generated pages do not fetch a remote runtime.
- Function assignment updates captured lexical variables, allowing event handlers to mutate page state.
- Input widgets use native browser input controls with password masking, required, length, and letters/numbers pattern constraints.
- CI currently verifies TypeScript compilation and the test suite on the development branch.

Still open for a complete 1.0 release: cross-page global state, imports/modules, reusable style classes, richer expression bindings, form submission lifecycle, full keyboard/screen-reader parity, responsive layout and sizing rules, image loading/error handling, security review, and browser-level integration tests.

### Milestone 6 — Cross-page session global state

Implemented on `oru-1.0.0-dev`:
- Added `global name = value` declarations to the core language.
- Added optional initial global values to interpreter startup and a dedicated global-state snapshot API.
- Separated page-local `state` variables from shared global variables so same-named values do not overwrite each other.
- The browser runtime restores shared values from the current tab session and saves them after button handlers run.
- Global initializers only apply when a shared value does not already exist, so navigation does not reset it.
- Added tests for global state restoration and local/global name isolation.

**Still incomplete:** asynchronous state updates, persistence beyond the current tab session, richer expression bindings, modules/imports, style classes, form workflows, and full accessibility/security/browser validation.


### Milestone 7 — Page-local reusable style classes

Implemented on `oru-1.0.0-dev`:
- Added top-level `class name:` declarations with indented style properties.
- Added widget application through `class: name`.
- The compiler validates that a class exists and that its properties are supported by the target widget type.
- Direct widget properties override class defaults.
- Added tests for style class parsing, application, and incompatible properties.

**Still incomplete:** importing classes across files, module loading, richer expression bindings, full form workflows, and the remaining runtime/accessibility/security work.


### Milestone 8 — Cross-file style class imports

Implemented on `oru-1.0.0-dev`:
- Added named imports with `from module.path import className`.
- Added namespace imports with `import module.path`; imported classes are referenced as `namespace.className`.
- Module paths resolve relative to the importing page file and point to another `.oru` page.
- Imports can be chained; circular imports, missing modules/classes, and class name collisions produce build errors.
- Added project build tests for named imports, namespace imports, and circular import rejection.

**Scope boundary:** this first import milestone shares style classes only. General-purpose function/module imports and external package imports remain unfinished.


### Milestone 9 — Style imports and route validation

- Named and namespace style-class imports are parsed and resolved across `.oru` page modules.
- Import resolution rejects missing modules/classes, duplicate names, project traversal, and circular imports.
- Internal links are checked against the project's route table at compile time; unresolved links fail the build rather than becoming arbitrary external navigation.
- Added tests for import resolution, cycles, and invalid internal routes.
- Fixed a duplicate compiler import discovered by CI. The latest verification for commit `9cfac475e2ea13a9f1ff0cc928b79270f619e5ee` passed both `npm test` and `npm run build`; subsequent documentation and route-test commits are awaiting a fresh CI run.

**Remaining before ORU 1.0:** general-purpose module/function imports, richer expression bindings, full form submission and validation, responsive layout, accessibility parity, asset/security hardening, and browser-level integration tests. Do not publish or merge as a release yet.

### Milestone 10 — Bound inputs and native constraints

Implemented on `oru-1.0.0-dev`:
- Added `input(name)` bindings to declared page or global variables.
- Added a core interpreter setter that preserves variable type checks.
- Input changes update the ORU variable and refresh bound UI content.
- Existing native constraints now cover input type, required, minimum/maximum length, and letters/numbers patterns.
- Password inputs are masked in the Canvas layer and must bind to page-local state.
- Added tests for input state updates and generated native constraints.

**Still incomplete:** form submission workflows, custom validation messages, file inputs, async updates, and comprehensive accessibility/browser testing.


### Decision — Native form lifecycle (2026-11-01)

| Area | Decision | Consequence |
|---|---|---|
| Forms | Add a built-in `form:` container widget. A form may declare `on.submit: functionName`; buttons nested in that form submit it by default. | The browser's native constraint validation runs before the ORU submit handler. Invalid forms do not invoke the handler. A valid submission prevents a page reload, calls the named ORU function, persists session globals, and refreshes the page. Inputs remain bound to ORU state through `input(name)`. Forms do not imply a backend or transmit data automatically. |



### Milestone 11 — Native form submission

Implemented on `oru-1.0.0-dev`:
- Added the `form:` container widget.
- Forms require `on.submit: functionName` referencing a function declared in the page's `logic:` block.
- Buttons inside forms submit the form by default; click handlers on those buttons are rejected to avoid ambiguous event behavior.
- The browser's native validation runs before submission. Invalid forms do not invoke the ORU handler.
- Successful submission prevents a page reload, invokes the ORU function, persists session globals, and refreshes the UI.
- Bound inputs now synchronize state while typing without re-rendering and interrupting focus.
- Added parser/compiler tests and form documentation.

**Still incomplete:** server-side submission is intentionally outside the browser compiler; advanced form controls, custom validation messages, file inputs, async form workflows, responsive layout, accessibility parity, security hardening, and browser integration tests remain open.
