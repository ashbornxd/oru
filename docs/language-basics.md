# ORU language basics (prototype)

ORU source files use the `.oru` extension. Indentation defines nested content. Use four spaces per level; tabs are not supported.

## Project settings

At the top of a file:

```python
title = "My website"
description = "What this website is about."
background = "#ffffff"
font = "assets/site-font.woff2"
```

## Pages

Every project needs at least one page. The `index` page becomes `index.html`.

```python
page index:
    section:
        heading("Welcome")
```

Additional pages become separate HTML files:

```python
page about:
    heading("About")
```

## Elements

Available elements: `section`, `container`, `row`, `column`, `nav`, `header`, `footer`, `main`, `heading`, `text`, `image`, `button`, `link`, `input`, `divider`, `list`, and `item`.

Text-like elements accept a quoted value. A colon is only needed when the element contains nested content or styles:

```python
heading("A page heading"):
    font-size = 36px

text("A paragraph of text.")
image("assets/photo.jpg")
link("Read more", "about.html")
button("Go home", "go index.html")
input("Your email")
```

## Styling

Put styles inside an element's indented block:

```python
section:
    background = "#f4f4f4"
    padding = 24px
    border-radius = 12px
```

Text-specific shortcuts are supported:

```python
text("Hello"):
    text-size = 20px
    text-color = navy
```

## Reusable classes

Define a class before using it:

```python
class Card:
    background = white
    padding = 24px
    border-radius = 12px

page index:
    Card:
        heading("A reusable card")
        text("The class styles are applied to this container.")
```

## Notes

This is the first compiler prototype. It intentionally supports a small language surface; unsupported syntax produces a line-numbered error instead of being silently ignored.
