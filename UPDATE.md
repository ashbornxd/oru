# ORU 1.0.0 — Planning Log

> Temporary planning document. Record every agreed product, language, runtime, tooling, and release decision here as soon as it is made. Use this document as the source of truth when designing and building ORU 1.0.0.

**Current published version:** 0.3.0  
**Target version:** 1.0.0  
**Status:** Planning — no 1.0 implementation decisions are final unless recorded below.

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
- **Still to design:** Exact type set, inference rules, operators, expressions, functions, control flow, input conversion, and error timing. Do not assume Python's existing `pass` semantics.
- Core syntax, values, expressions, variables, functions, control flow, and errors.
- **Agreed file/page model:** One `.oru` file defines one page; each file has its own metadata such as title and description. The rules for routing and mapping filenames to URLs remain open.
- Pages, reusable components, properties/arguments, slots or composition.
- Styling model, responsive behavior, themes, and custom CSS escape hatches.
- Imports, project organization, and code reuse.

### 3. Application capabilities
- **Agreed direction:** Support UI events and interaction states, including button click, hover, active, and disabled states. Buttons may contain text or images.
- **Agreed direction:** Provide form and input widgets for ordinary text and sensitive values such as passwords, with configurable constraints such as letters-only or numbers-only. Password inputs conceal entered characters; actual secure handling and validation rules must be designed explicitly.
- **Agreed:** ORU 1.0 will have a built-in state system so interactions can update application data and UI (for example, changing a button label to `Logging in...` after it is clicked). State declaration syntax, update semantics, reactivity, and lifecycle are still open.
- **Agreed:** State is automatically reactive. When a state value changes, all UI elements that depend on it update automatically; developers do not manually refresh the UI. Dependency tracking and update scheduling remain to be designed.
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
