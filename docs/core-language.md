# ORU 1.0 language core (development)

This document describes the first implemented slice of the ORU 1.0 language engine. It is a development specification, not a claim that the complete 1.0 runtime or UI system is finished.

## Source format

Use four spaces per indentation level. Tabs are rejected. Blocks end when indentation returns to the previous level. Triple double quotes delimit comments; lines beginning with `#` are also ignored.

## Values and variables

The initial value types are strings, numbers, booleans, lists, and dictionary/object values.

```oru
siteName = "ORU"
visits = 0
enabled = true
items = ["one", "two"]
profile = {name: "Kunal", age: 16}

pending = pass
pending = "ready"
```

A variable assigned `pass` is declared but uninitialized. Reading it before a later assignment is an error. Its type is inferred from the first non-`pass` value. Later assignments must keep that type.

## Expressions

The initial expression operators are:

- Arithmetic: `+`, `-`, `*`, `/`, `//`, `%`, `**`
- Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Logic: `and`, `or`, `not` (also `!`)
- Grouping: parentheses
- Access: object properties and list/string/object indexing

`+` joins two strings or adds two numbers. Arithmetic operators require numbers. Logical operators short-circuit and return one of their operand values. Conditions use ORU truthiness: `false`, `pass`, numeric zero, and the empty string are false; other values are true.

## Functions

```oru
func greet(name):
    return "Hello " + name

message = greet("ORU")
print(message)
```

Functions use lexical closures and local parameter scopes. A function without an explicit return produces `pass`. Function overloading and explicit type annotations are not part of this initial core.

## Conditions and loops

```oru
if visits > 10:
    print("Popular")
elif visits > 0:
    print("Getting started")
else:
    print("New")

for item in items:
    print(item)

count = 0
while count < 3:
    count = count + 1
    if count == 2:
        continue
    print(count)
```

`for` iterates over a list or string. `while` repeats while its condition is true. `break` exits the nearest loop and `continue` advances to its next iteration. Both are errors outside a loop.

## Built-ins

- `print(value, ...)` writes a space-separated line to the run output.
- `len(value)` returns the length of a string, list, or object.
- `range(stop)`, `range(start, stop)`, or `range(start, stop, step)` creates a list of numbers for iteration.

Execution has a configurable statement/iteration limit to guard against accidental infinite loops.

## Current implementation boundary

The TypeScript core interpreter is available through the package subpath `@ashbornxd/oru/language` and the CLI command `oru eval script.oru`. It is covered by `src/core.test.ts`. A script passed to `oru eval` must use the general-purpose language syntax in this document; it is not yet a page file. The core is not yet integrated with the per-file page model, imports, reactive state, browser APIs, or the Canvas 2D UI renderer. Those systems remain separate 1.0 milestones and must not be assumed to work yet.
