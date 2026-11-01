# ORU asynchronous execution

Status: approved language direction for ORU 1.0.0; implementation in progress.

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
- The synchronous API must reject async declarations and await expressions with a clear source-line error. It must never silently leak a Promise.
- The async API may execute synchronous and asynchronous functions in one program.
- Async host calls are explicitly registered capabilities; no arbitrary JavaScript evaluation, host globals, or unrestricted module loading.
- Promise values are runtime-only and cannot be stored in ORU lists, objects, or state.
- Awaited statements execute sequentially. Parallel execution is not implicit.
- Async execution preserves step limits, type checks, state/global semantics, and useful source locations.
- Browser event handlers await completion before persisting global state and rendering. Rejections are caught and reported without unhandled promise rejections.

## Required verification

Parser tests: async declarations, await precedence and grouping, invalid await placement.

Runtime tests: host promises, async-to-async calls, return values, rejected promises, step limits, and page/global state after suspension.

Browser tests: async click and form handlers, state persistence after completion, repeated interactions, and rejected handler reporting.
