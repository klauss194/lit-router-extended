---
id: anchor-links
name: Anchor Links
order: 9
description: >
  How lit-router handles anchor (<a>) clicks: automatic interception via
  capture-phase listener on window, conditions for interception, router-ignore
  attribute for exclusions, hash link handling, query and hash parsing from
  href, and error events for failed navigations through links.
---

## Anchor Links

The `Router` intercepts all `<a>` clicks automatically. A single event listener is installed on `window` in capture phase — no per-link wiring, no event delegation boilerplate.

When a click meets the interception conditions, the Router calls `e.preventDefault()` and `router.navigate()`, then `window.scrollTo(0, 0)`. The page does not reload.

### Interception Conditions

All of the following must be true for the Router to take over. If any condition fails, the browser handles the click normally.

| Condition | Why |
|---|---|
| `e.defaultPrevented` is `false` | Another listener already consumed the event |
| The composed path contains an `<a>` element | Clicks on nested children of `<a>` still work |
| The anchor has an `href` attribute | Links without `href` are not navigable |
| `e.button === 0` | Left-click only; middle-click and right-click open new tabs |
| No modifier keys (Alt, Ctrl, Meta, Shift) | User intent is to open in new tab/window |
| No `download` attribute | Downloads are handled by the browser |
| No `router-ignore` attribute | Explicit opt-out from router handling |
| Target is not `_blank`, `_parent`, or `_top` | Cross-context navigation is browser territory |
| Same origin as `window.location` | External domains load normally |

### Basic Usage

Zero configuration. Drop `<a>` elements anywhere in your templates.

```typescript
import { LitElement, html } from 'lit';
import Router from 'lit-router';

class App extends LitElement {
  _router = new Router(this, [
    { path: '/',       render: () => html`<home-page></home-page>` },
    { path: '/users',  render: () => html`<users-page></users-page>` },
    { path: '/about',  render: () => html`<about-page></about-page>` },
    { path: '*',       render: () => html`<not-found></not-found>` },
  ]);

  render() {
    return html`
      <nav>
        <a href="/">Home</a>
        <a href="/users">Users</a>
        <a href="/about">About</a>
      </nav>
      <main>${this._router.outlet()}</main>
    `;
  }
}
```

Each click navigates to the target route, updates the URL bar, and scrolls to the top — no page reload, no explicit event listeners.

### Links with Query and Hash

The Router parses `?query` and `#hash` directly from the `href` attribute.

```html
<a href="/search?q=lit+router">Search results for "lit router"</a>
<a href="/docs#lifecycle">Jump to lifecycle section</a>
```

The first link calls `router.navigate("/search", { searchParams: { q: "lit router" } })`. The second calls `router.navigate("/docs", { hash: "lifecycle" })`. Both are accessible in the target route's `render` callback via `searchParams` and `hash`.

### Excluding Links with `router-ignore`

Add the `router-ignore` attribute to any `<a>` that should bypass the Router. The browser handles the click normally — external navigation, download, or full page reload.

```html
<!-- External domains -->
<a router-ignore href="https://github.com/lit-router">View on GitHub</a>

<!-- Downloads -->
<a router-ignore href="/api/reports/export" download>Download Report</a>

<!-- Opening in a new tab (handled by target attribute automatically) -->
<a href="/users" target="_blank">Users in new tab</a>
```

The `target` attribute with `_blank` already bypasses the Router — you don't need `router-ignore` for new-tab links. Use `router-ignore` for same-origin links that should NOT go through the router: downloads, API endpoints that return files, or links handled by a third-party script.

### Hash Links Within the Same Page

Links that point to `#section` on the current page need `router-ignore`. Without it, the Router intercepts the click, calls `navigate()`, and scrolls to the top — overriding the browser's native scroll-to-anchor behavior.

```html
<!-- Wrong: Router intercepts, navigates, scrolls to top -->
<a href="#faq">Frequently Asked Questions</a>

<!-- Correct: Browser scrolls to the #faq element -->
<a router-ignore href="#faq">Frequently Asked Questions</a>
```

Hash-based navigation within a single page is a scroll operation, not a route change. Let the browser handle it.

### Error Handling

When an anchor click triggers a navigation that fails, the Router distinguishes two error types:

- **`InvalidNavigationError`** — swallowed silently. This covers cancelled navigations (enter/leave returned `false`), missing routes, and invalid push attempts. The page stays where it is.

- **Any other error** — dispatched as `RouterNavigationErrorEvent` (event name `"lit-router-error"`) on the `<a>` element, then re-thrown in a microtask for global error telemetry.

```typescript
render() {
  return html`
    <nav @lit-router-error=${this._onLinkError}>
      <a href="/">Home</a>
      <a href="/broken-route">Broken Link</a>
    </nav>
  `;
}

_onLinkError(e) {
  console.error('Link navigation failed:', e.detail.error.message);
  // Show a toast, redirect, or log to telemetry
}
```

The event bubbles, so a single listener on a parent element covers all descendant links. The `detail` object contains `{ url, error }`.

###  Anchor Navigation vs Programmatic

| | `<a href="/users">` | `this.nav.navigate("/users")` |
|---|---|---|
| Trigger | User click on an anchor | Any code path (button, timeout, response handler) |
| URL bar | `history.pushState` | `history.pushState` |
| Scroll | `scrollTo(0, 0)` automatically | Manual — you control when and where |
| Error handling | `@lit-router-error` event on the anchor | `try/catch` around `await` |
| Cancellation | Not applicable | Can await the promise to confirm success |

Use anchor links for declarative navigation in templates. Use `navigate()` for navigation triggered by logic — form submissions, redirects after async operations, or programmatic flows where you need to await the result.
