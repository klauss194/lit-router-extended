---
id: anchor-interception
name: How Anchor Interception Works
order: 1
---

## The Interception Mechanism

The `Router` intercepts all `<a>` clicks automatically. A single event listener is installed on `window` in the capture phase. This removes the need for per-link wiring or event delegation boilerplate.

When a click meets the interception conditions, the Router calls `e.preventDefault()`, `router.navigate()`, and `window.scrollTo(0, 0)`. 

### Interception Conditions

If any of these conditions fail, the browser handles the click natively:

| Condition | Why it must be met |
|---|---|
| `e.defaultPrevented` is `false` | Another listener already consumed the event |
| Composed path contains an `<a>` | Clicks on nested children of `<a>` must bubble |
| Anchor has an `href` | Links without `href` are not navigable |
| `e.button === 0` | Middle/Right-clicks open new tabs |
| No modifier keys | User intent is to open in new tab/window |
| No `download` attribute | Downloads are handled by the browser |
| No `router-ignore` attribute | Explicit opt-out from router handling |
| Target is not `_blank`, `_parent`, etc. | Cross-context navigation is browser territory |
| Same origin as `window.location` | External domains load normally |

## Anchor Navigation vs Programmatic

| | Anchor Links (`<a>`) | Programmatic (`navigate()`) |
|---|---|---|
| Trigger | User click | Any code path (timeouts, fetch) |
| Scroll | `scrollTo(0, 0)` automatically | Manual |
| Error handling | `@lit-router-error` event | `try/catch` block |
