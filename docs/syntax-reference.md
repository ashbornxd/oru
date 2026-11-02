# ORU 1.0 syntax reference

A compact guide to the syntax implemented by the ORU 1.0 development branch. Use four spaces for each indentation level; tabs are rejected. Blocks end when indentation returns to the previous level. This reference describes the current implementation, not planned syntax.

## 1. Project files

A project has an `oru.config`, an `index.oru`, and optional additional page/module files.

```text
my-site/
├── oru.config
├── index.oru
├── about.oru
├── lib/
│   └── helpers.oru
└── assets/
    └── mark.svg
```

`oru.config`:

```text
name: "My Website"
```

Each `.oru` file contains one page. `index.oru` maps to `/`; `about.oru` maps to `/about`; nested files map to nested extensionless routes.

## 2. Page file structure

The supported top-level order is optional metadata, optional style classes, optional logic, then the page widget tree.

```oru
metadata:
    title: "My website"
    description: "A short description."
    language: "en"

class Card:
    background: #f2f4f8
    padding: 20
    radius: 12

logic:
    state count = 0
    func increment():
        count = count + 1

page:
    column:
        text("Hello, ORU!")
        button("Add"):
            on.click: increment
        text(count)
```

Metadata supports `title`, `description`, and `language`. Unknown metadata keys are errors.

## 3. Values, variables, and expressions

The language core supports strings, numbers, booleans, lists, and object/dictionary values.

```oru
name = "ORU"
version = 1
enabled = true
items = ["one", "two"]
profile = {name: "ORU", version: 1}
unassigned = pass
unassigned = "ready"
```

`pass` declares an uninitialized variable; reading it before assignment is an error. The first non-`pass` assignment determines its type, and later assignments must keep that type.

Operators:

- Arithmetic: `+`, `-`, `*`, `/`, `//` (floor division), `%`, `**`.
- Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=`.
- Logic: `and`, `or`, `not`, and `!`.
- Grouping: parentheses, for example `(price + tax) * quantity`.
- Access: `profile.name`, `items[0]`, and string/list/object indexing.

`+` adds two numbers or joins two strings. Logical operators short-circuit. False values are `false`, `pass`, numeric zero, and the empty string.

## 4. Functions, conditions, and loops

```oru
func greet(person):
    return "Hello " + person

if enabled:
    print(greet(name))
elif version == 0:
    print("Preview")
else:
    print("Disabled")

for item in items:
    print(item)

index = 0
while index < 3:
    index = index + 1
    if index == 2:
        continue
    print(index)
```

Functions use `func name(parameters):`; `return value` exits a function. A function without `return` produces `pass`. Conditions use `if`, optional `elif`, and optional `else`. `for` iterates over lists or strings; `while` repeats while its condition is true. `break` exits the nearest loop and `continue` advances it.

Built-ins: `print(value, ...)` writes output; `len(value)` returns string/list/object length; `range(stop)`, `range(start, stop)`, and `range(start, stop, step)` create number lists.

## 5. Async syntax

```oru
async func loadGreeting():
    result = await getGreeting()
    return result

async func showGreeting():
    greeting = await loadGreeting()
    print(greeting)
```

Declare asynchronous functions with `async func`; use `await expression` only inside an async function. Awaited work runs sequentially. Host async functions are available only when explicitly registered by the host runtime. The CLI `oru eval file.oru` uses the async interpreter.

## 6. State and imports

Inside `logic:`, `state name = value` creates page-local state. `global name = value` creates a value shared across pages in the same browser tab session. Global values are session-scoped, not permanent storage.

```oru
from lib.helpers import welcome, getGreeting
import lib.theme

logic:
    state greeting = welcome("visitor")
    async func refreshGreeting():
        greeting = await getGreeting()

page:
    column:
        class: lib.theme.PageShell
        text(greeting)
        button("Refresh"):
            on.click: refreshGreeting
```

Named imports can import top-level functions and plain values from a module's `logic:` block, as well as named style classes. Namespace imports are used for style classes (for example `lib.theme.PageShell`). Module paths are relative to the importing file. Circular imports and name collisions are rejected. Modules are also page files and contain a `page:` block.

## 7. Widget syntax

Widgets are nested under `page:`. Put properties on indented lines after a widget and end the widget header with a colon when it has properties or children. Widget property values use `key: value`, not equals signs.

| Widget | Purpose |
| --- | --- |
| `column:` | Vertical container |
| `row:` | Horizontal container when wide; wraps vertically below `wrapAt` |
| `box:` | Group related content |
| `form:` | Native form with submit handler and validation |
| `text("...")` | Text or a bound variable, e.g. `text(count)` |
| `button("...")` | Action button |
| `link("Label", "route")` | Internal page link |
| `image("assets/mark.svg", "Alt text")` | Image |
| `input(email)` | Bound native input |
| `textarea(message)` | Bound multiline input |
| `select(topic):` | Bound dropdown containing options |
| `option("Website"):` | Dropdown option |

Example:

```oru
page:
    column:
        text("Welcome"):
            size: 32
            weight: 700
        row:
            wrapAt: 640
            box:
                text("First panel")
            box:
                text("Second panel")
        image("assets/mark.svg", "Site mark"):
            width: 64
            height: 64
        link("About", "about")
```

## 8. Layout and styling

Containers support `width`, `height`, `padding`, `gap`, `background`, and `radius`. Their alignment properties are:

- `mainAlign`: `start`, `center`, `end`, `spaceBetween`, or `spaceAround`.
- `crossAlign`: `start`, `center`, `end`, or `stretch`.
- `wrapAt`: row width at which the row changes to horizontal flow (default 560px).

Text supports `color`, `size`, `weight`, `font`, `line`, `align`, `role`, and `level`. Use `role: heading` and `level: 1` through `6` for semantic headings. Buttons support `background`, `color`, `size`, `weight`, `radius`, `padding`, `width`, `disabled`, `icon`, and `alt`. State styles include `hover.background`, `hover.color`, `active.background`, `active.color`, `disabled.background`, and `disabled.color`.

Reusable classes are declared before `logic:` and `page:`, then applied with `class: ClassName`. Direct widget properties override class values. Classes can be imported from other files.

```oru
class Panel:
    background: #f1f3f7
    padding: 24
    radius: 16
    gap: 12

page:
    box:
        class: Panel
        text("Reusable panel")
```

## 9. Events and buttons

Buttons accept `on.click`, `on.hover`, `on.active`, and `on.leave`. Each value names a function in the page's `logic:` block.

```oru
logic:
    state message = "Ready"
    func activate():
        message = "Activated"

page:
    button("Run"):
        on.click: activate
    text(message)
```

Buttons inside a form submit that form; use the form's `on.submit` rather than a button click handler.

## 10. Forms and native controls

A form requires `on.submit: functionName`. The browser validates native constraints first; ORU calls the handler only when validation succeeds. Submission does not send data to a server automatically. Set `validationSummary: true` to show an accessible list of invalid fields.

Inputs, textareas, and selects support `label`, `placeholder`, `required`, `disabled`, `readOnly`, `name`, `width`, `height`, `padding`, `background`, `color`, `text.color`, `border.color`, `radius`, and `size`, subject to each control's applicable properties.

Input-specific properties: `type`, `min`, `max`, `step`, `minLength`, `maxLength`, `pattern`, `autocomplete`, `accept`, `multiple`, `constraint`, and `validationMessage`. `constraint: letters` and `constraint: numbers` apply built-in patterns. Textareas support `rows`, `minLength`, `maxLength`, and `matches`. Selects support `placeholder` and `matches`; define their choices as `option("Label"):` with optional `value: "stored-value"`.

Use `matches: otherBinding` to compare a field with another bound field in the same form. Use `validationMessage: "..." ` to customize a field's validation message. Password fields must use page-local state, not global state.

```oru
logic:
    state email = ""
    state password = ""
    state confirmation = ""
    func submitForm():
        print("Validated locally")

page:
    form:
        on.submit: submitForm
        validationSummary: true
        input(email):
            type: email
            required: true
            autocomplete: email
            label: Email
            placeholder: "you@example.com"
        input(password):
            type: password
            required: true
            minLength: 8
            label: Password
        input(confirmation):
            type: password
            required: true
            matches: password
            validationMessage: "Passwords must match."
            label: Confirm password
        button("Submit")
```

For `type: file`, `accept` filters the picker and `multiple: true` allows several files. State receives filenames only; ORU does not upload or expose file bytes.

## 11. Routes, images, and assets

Use extensionless project-relative routes in `link("Label", "about")`. `index.oru` maps to `/`; `pages/help.oru` maps to `/pages/help`. Local image paths must be inside `assets/`; HTTPS image URLs are also supported. Path traversal, missing local assets, unsafe URL schemes, and symlinks in the asset tree are rejected.

## 12. Comments and formatting

Use four spaces per indentation level. Tabs are rejected. Lines beginning with `#` are ignored. Triple double quotes delimit comments. Keep indentation consistent; indentation defines block boundaries.

## 13. CLI commands

```sh
oru create my-site
cd my-site
oru run dev
oru build
oru eval script.oru
```

`oru run dev` starts the development server; `oru build` writes static output to `dist/`; `oru eval` runs a language-core script. Page widgets and browser APIs are available in compiled page projects, not in standalone `oru eval`.

## Related references

- [Language core](core-language.md) for interpreter semantics.
- [Page files and browser runtime](page-files.md) for compiler and runtime details.
- [Async execution](async-execution.md) for async runtime behavior.
- [Release checklist](release-checklist.md) for remaining 1.0 release gates.
