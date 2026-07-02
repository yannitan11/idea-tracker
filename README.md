# Design Idea Tracker

A calm, single-user space to capture design ideas and track them from a spark to
something shipped. No login, no backend, no accounts — everything lives in your
browser's `localStorage`.

## Run locally

ES modules need to be served over HTTP (not opened as `file://`):

```bash
cd "Design Idea Tracker"
python3 -m http.server 8000
```

Then open http://localhost:8000.

## What's here

- **Board** (home) — a kanban board with one column per stage. Drag cards
  between columns to restage. `+ New idea` (or press `n`) to capture.
- **List** — searchable, filterable list. Filter by stage / tag / priority,
  sort by recent / created / priority / A–Z.
- **Detail** — click any card to open. Inline-edit every field (click to edit),
  append timestamped notes, add links, change stage/priority, or delete.

### Stages
Spark → Exploring → Designing → Review → Shipped, plus Parked. Defined in
`js/config.js` — edit that file to rename, recolor, reorder, add, or remove
stages and priorities.

### Keyboard shortcuts
- `n` — new idea
- `/` — focus search
- `b` — board view
- `l` — list view
- `⌘/Ctrl + Enter` — save (in the capture form and note box)
- `Esc` — cancel an inline edit / close the modal

### Your data
Everything is stored locally in `localStorage`. Use the `⋯` menu to **Export
JSON** (round-trips via Import), **Export Markdown** (readable backup), or
**Import JSON** (replaces the current set).

## Architecture

Vanilla, no-build ES modules — no framework, no bundler.

```
index.html        shell + top bar
styles.css        all styling, light + dark themes via CSS variables
js/
  config.js       stages + priorities (the main thing to customize)
  store.js        data model, localStorage persistence, pub/sub
  util.js         helpers + a small safe markdown-lite renderer
  capture.js      quick-add modal
  board.js        kanban board + native drag-and-drop
  list.js         filter / sort / search list
  detail.js       single-idea view with inline editing + notes
  export.js       JSON / Markdown export + JSON import
  app.js          nav, hash router, view switching, stats, dark mode
```

Data flows one way: views call `store.js` mutators → the store persists and
notifies subscribers → the current view re-renders.
