# Changelog

All notable ORU releases are documented here.

## [0.9.0] - 2026-11-02

First public release of the new ORU language and browser application runtime.

### Added
- General-purpose language core with values, type-stable variables, expressions, functions, conditionals, loops, and built-ins.
- Project CLI for project creation, local development, static builds, and script evaluation.
- One-page-per-`.oru` project model, route generation, asset handling, module imports, and reusable style classes.
- Canvas 2D browser renderer with semantic DOM content and native keyboard-operable controls.
- Page-local and session-scoped global state, reactive bindings, event handlers, and async execution.
- Native forms, inputs, textarea, select, file selection, browser constraints, cross-field matching, and validation summaries.
- Responsive layouts, route/path validation, baseline security headers, and per-document hash-based CSP.
- Syntax reference, language/runtime documentation, runnable showcase, security policy, and automated test suites.

### Notes
- ORU 0.9.0 is a pre-1.0 release. Breaking changes may occur as user feedback informs the language.
- File selection currently exposes filenames only; it does not upload file contents.
- Forms do not send data to a server automatically.
- The previous 0.3.0 release remains a separate historical release.

