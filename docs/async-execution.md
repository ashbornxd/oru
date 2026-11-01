# ORU asynchronous execution

Status: async interpreter, CLI entry point, and browser event integration implemented; full compatibility and release verification remain in progress.

## Syntax

Asynchronous functions use `async func`:

```oru
async func loadProfile(userId):
    profile = await fetchProfile(userId)
    return profile

async func showProfile():
    profile = await loadProfile(42)
    print(profile.name)
```

`await` is an expression operator and is valid only inside an asynchronous function. Awaiting a non-promise value returns that value unchanged, allowing host functions to return either immediate values or promises.

## Runtime contract

- Preserve `run(source)` and synchronous `call()` for existing programs.
- Add `runAsync(source)` and `callAsync(name, ...args)`.
- The synchronous API must reject calls to async functions and await expressions with a clear source-line error. It must never silently leak a Promise.
- The async API may execute synchronous and asynchronous functions in one program.
- Async host calls are explicitly registered capabilities; no arbitrary JavaScript evaluation, host globals, or unrestricted module loading. Async lists and call arguments evaluate left-to-right.
- Promise values are runtime-only and cannot be stored in ORU lists, objects, or state.
- Awaited statements execute sequentially. Parallel execution is not implicit.
- Async execution preserves step limits, type checks, state/global semantics, and statement-level source locations for expression failures.
- Browser event handlers must await completion before persisting global state and rendering. Rejections must be caught and reported without unhandled promise rejections. Async click, form-submit, hover, leave, and active event handlers now await completion before persisting global state and rerendering. Rejected handlers are logged and surfaced through an accessible alert banner.

## Required verification

Parser tests: async declarations, await precedence and grouping, invalid await placement.

Runtime tests: host promises, async-to-async calls, return values, rejected promises, step limits, and page/global state after suspension.

Browser tests: async click and form handlers, state persistence after completion, repeated interactions, and rejected handler reporting.

## Current implementation boundary

 The interpreter exposes `runAsync(source, options)` and `callAsync(name, ...args)`. Host capabilities are supplied through the explicit `asyncFunctions` option. It supports async function declarations, sequential awaitable calls, return values, local/global/state assignments, conditionals, loops, and the execution-step ceiling. Lists and function arguments evaluate left-to-right; awaits are not implicitly parallelized. The legacy `run()` / `call()` path remains synchronous and gives an explicit error if an async function is invoked there. The `oru eval <file>` CLI command uses the async interpreter, so local async functions can be executed from scripts.

Browser event dispatch awaits async handlers before persisting state and rerendering. Rejected handlers are caught and surfaced through an accessible alert. The remaining verification work is the full parser/runtime edge-case matrix, broader async form workflows, accessibility review, security/performance review, and real-device testing.
