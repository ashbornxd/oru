# ORU language basics

ORU uses the `.oru` extension and indentation to describe a website. Use four spaces per level. Tabs are not supported.

## Project settings

Set these at the top of `main.oru`:

```oru
title = "My website"
description = "A short description."
background = "#ffffff"
font = "assets/site-font.woff2"
```

## Pages

The `index` page becomes `index.html`. Other pages become their own HTML files.

```oru
page index:
    section:
        heading("Welcome")
        text("A website made with ORU.")

page about:
    heading("About")
```

## Elements

- Structure: `section`, `box`
- Layout: `stack`, `grid`
- Content: `heading`, `text`, `image`, `video`, `divider`
- Actions: `button`, `link`
- Forms: `form`, `input`
- Lists: `list`, `item`
- Navigation: `nav`

Elements can be empty or contain nested elements. Add a colon when an element has children or styles.

```oru
section:
    heading("A title")
    text("A short description.")
    image("assets/photo.jpg", "A landscape")
    link("Read more", "about.html")
    button("Open projects", "go #projects")
```

## Styling

ORU uses element-scoped properties rather than CSS property names. The scope must match the element being styled.

```oru
section:
    section.background = "#f4f4f4"
    section.padding = 32
    section.radius = 16

    heading("Build something"):
        heading.size = 44
        heading.color = "#182230"
        heading.weight = bold
        heading.align = center

    text("A little text"):
        text.size = 18
        text.color = "#596579"
        text.line = 1.6

    button("Get started"):
        button.background = "#2457d6"
        button.color = white
        button.radius = 12
        button.padding = 12 20
```

Numbers for text sizes are treated as pixels and automatically scale down on smaller screens. Other numeric spacing values use the browser's pixel unit. Values with units, such as `2rem` or `12px`, can also be used.

### Layouts

A stack places children vertically. A grid automatically fits as many columns as its available width allows, then becomes one column on narrow screens.

```oru
stack:
    stack.gap = 16
    text("First")
    text("Second")

grid:
    grid.columns = 3
    grid.gap = 20
    box:
        text("Card one")
    box:
        text("Card two")
```

## Reusable styles

Define a reusable wrapper once, then use its name inside a page.

```oru
class Card:
    class.background = white
    class.padding = 24
    class.radius = 16

page index:
    Card:
        heading("A reusable card")
        text("The class styles are applied to this box.")
```

## Mobile behavior

ORU's generated pages include responsive defaults: flexible images and videos, wrapping text, touch-sized controls, fluid numeric text sizes, auto-fitting grids, and layouts that fit narrow screens. You do not need to create a separate mobile page.

These defaults are a starting point, not a guarantee that every design will look perfect on every device. Preview your site at phone and desktop widths.

## Build

```sh
oru run dev
oru build
```

The compiler generates static HTML with embedded CSS and small interaction scripts. You can host the output on any static web host.
