# ORU 1.0 language core (development)

This document describes the first implemented slice of the ORU 1.0 language engine. It is a development specification, not a claim that the complete 1.0 runtime or UI system is finished.

## Source format

Use four spaces per indentation level. Tabs are rejected. Blocks end when indentation returns to the previous level. Triple double quotes delimit comments; lines beginning with `#` are also ignored.

## Values and variables

The initial value types are strings, numbers, booleans, lists, and dictionary/object values. Object values use own keys only; inherited JavaScript prototype properties are not exposed through ORU property access.

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

Functions use lexical closures and local parameter scopes. A function without an explicit return produces `pass`. Function overloading and explicit type annotations are not part of this initial core. A nested `global name = value` statement updates shared session state; a top-level `global` declaration only initializes the value when it has not already been restored from the current browser tab session.

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

The TypeScript interpreter is available through the package subpath `@ashbornxd/oru/language` and the CLI command `oru eval script.oru`. A script passed to `oru eval` uses the general-purpose language syntax in this document; it is not a page file. The page compiler uses the same interpreter for page logic, state, event handlers, asynchronous functions, and imported module functions. Browser APIs are not exposed implicitly: browser integrations must be supplied through explicitly registered host capabilities. The Canvas 2D renderer and semantic DOM controls are part of the page runtime, not the standalone `oru eval` command.
