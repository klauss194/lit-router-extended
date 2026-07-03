# demo

Plain HTML + Lit demo app exercising every feature documented in `../docs`:
static/dynamic/optional/wildcard/catch-all matching, sync & async `enter`/`leave`
hooks, `AbortSignal` cancellation, the `goto()` redirect pattern, nested
`Routes` with `push()`/`pop()` (including the modal pattern), `router.subscribe()`,
`replaceState`-style `searchParams`/`hash` setters, and the
`lit-router-location-changing` / `-changed` window events (all visible live in
the on-screen event log).

## Setup

Requires Node 24+. The `lit-router-extended` dependency is wired via
`"file:.."` in `package.json`, so `npm install` symlinks it straight to the
repo root — edits to `../src` are picked up on save, no publish/link step
needed.

```bash
npm install
npm run dev
```

Then open the printed local URL and click around while watching the event
log pinned to the bottom of the page.

## Where to look

- `src/demo-app.js` — the root `Router`, all top-level route definitions, hooks
- `src/demo-nav.js` — a component that only knows the router through `Navigation`
- `src/admin/` — nested `RoutesController`, `push()`/`pop()`, the modal pattern
- `src/pages/` — one file per route, each annotated with which feature it shows
