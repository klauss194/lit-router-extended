---
id: router-api
name: Router Instance API
order: 8
description: >
  Reference for the Router instance methods and events: subscribe for reactive
  state subscriptions, replaceState for silent URL updates without navigation,
  buildUrl for link construction, the difference between goto and navigate,
  the redirect pattern inside enter callbacks, custom events for analytics
  and loading indicators, and error types with their metadata shapes.
---

## Getting the Router Reference

Every component with a `Navigation` controller can access the root `Router` instance via `this.nav.router`. Components that own the `Router` directly already have the reference.

```typescript
const router = this.nav.router;  // from Navigation controller
const router = this._router;     // from owning component
```

## `router.subscribe(callback)`

Subscribes to route state changes. The callback receives `{ eventName, prev, next }` on every navigation. The current state is delivered immediately upon subscription — late subscribers don't miss the initial route.

```typescript
import Router from 'lit-router';

class AnalyticsTracker extends LitElement {
  _router = new Router(this, [
    { path: '/', render: () => html`<home-page></home-page>` },
  ]);

  constructor() {
    super();
    this._router.subscribe(({ next }) => {
      console.log(`Route changed to ${next.pathname}`);
      // Fire analytics event, update page title, etc.
    });
  }
}
```

The callback signature:

```typescript
subscribe(callback: (detail: {
  eventName: "location-changed" | "location-changing",
  prev: { pathname, params, searchParams, hash } | undefined,
  next: { pathname, params, searchParams, hash },
}) => void): () => void
```

Returns an unsubscribe function. Call it to stop receiving updates — useful in `hostDisconnected()`.

```typescript
const unsub = this._router.subscribe(this._onRouteChange);
// later:
unsub();
```

`prev` is `undefined` on the first delivery (no previous route exists).

## `router.replaceState(options)`

Updates the current URL's query string, hash, or extra state without triggering navigation. `enter` and `leave` callbacks do not fire. The URL bar updates silently via `history.replaceState`.

```typescript
// Update a filter without pushing to history
this._router.replaceState({ searchParams: { tab: 'active', page: '1' } });

// Set a hash anchor
this._router.replaceState({ hash: 'comments' });

// Store transient UI state
this._router.replaceState({ extraParams: { sidebarOpen: true } });
```

Use `replaceState` for UI state that should survive a page refresh but shouldn't create history entries — filter panels, tab selections, scroll positions, collapsed sections. For user-initiated navigation that should appear in browser history, use `navigate()` instead.

## `router.buildUrl(pathname)`

Constructs a full URL string for a given pathname, resolved against the current route. Does not navigate.

```typescript
const shareUrl = this._router.buildUrl('/reports/42');
// "https://app.example.com/reports/42"

const filteredUrl = this._router.buildUrl('/search?q=lit');
// "https://app.example.com/search?q=lit"
```

Use `buildUrl` for share buttons, copy-to-clipboard, `<a>` href generation in non-Lit contexts, or anywhere you need a string URL without triggering navigation.

## `goto()` vs `navigate()`

Both resolve a pathname and activate the matching route. The difference is the URL bar.

| | `goto(pathname, options?)` | `navigate(pathname, options?)` |
|---|---|---|
| URL bar | Does **not** update | Calls `history.pushState` |
| Use case | Internal routing, initial load, redirects inside enter | User-facing navigation |
| Returns | `Promise<boolean>` — `false` if cancelled | `Promise<void>` |

```typescript
// navigate() — user clicks a link or button
this._router.navigate('/dashboard');

// goto() — redirect inside an enter callback
{
  path: '/admin/*',
  enter: async () => {
    if (!isLoggedIn) {
      await this._router.goto('/login');
      return false;
    }
  },
  render: () => html`<admin-layout></admin-layout>`,
}
```

`goto()` returns `false` when navigation is cancelled (enter/leave returned false). `navigate()` resolves silently when cancelled.

## Redirect Pattern

The correct way to redirect inside an `enter` callback is to call `goto()` followed by `return false`. This tells the router: stop processing the current route, and don't update the URL bar twice.

```typescript
{
  path: '/dashboard',
  enter: async () => {
    if (!auth.isLoggedIn) {
      await this._router.goto('/login');
      return false;          // required — cancel this route
    }
  },
  render: () => html`<dashboard-page></dashboard-page>`,
}
```

Calling `navigate()` inside `enter` also works thanks to a navId guard that detects the redirect and skips the outer `pushState`. But `goto()` is the intentional API for this case — it changes the route state without touching the URL bar, and the outer `navigate()` call (from the anchor click or programmatic trigger) will push the final, correct URL.

## Custom Events

The `Router` dispatches events on `window` during navigation. Components anywhere in the DOM tree can listen for them.

### `RouterLocationChangingEvent` (`lit-router-location-changing`)

Fires **before** navigation starts. Cancelable — calling `e.preventDefault()` stops the navigation.

```typescript
window.addEventListener('lit-router-location-changing', (e) => {
  const { currentPathname, pathname } = e.detail;

  if (hasUnsavedChanges() && !confirm('Discard changes?')) {
    e.preventDefault();       // cancel navigation
  } else {
    showLoadingIndicator();   // prepare for the transition
  }
});
```

Event detail: `{ currentPathname, pathname, extraParams, searchParams, hash }`.

### `RouterLocationChangedEvent` (`lit-router-location-changed`)

Fires **after** navigation completes successfully.

```typescript
window.addEventListener('lit-router-location-changed', (e) => {
  const { pathname, params, searchParams } = e.detail;
  hideLoadingIndicator();
  document.title = `App — ${pathname}`;
});
```

Event detail: `{ pathname, params, extraParams, searchParams, hash }`.

### `RouterNavigationErrorEvent` (`lit-router-error`)

Fires on the `<a>` element when an anchor click causes a non-`InvalidNavigationError`. Already covered in [Anchor Links](#) — use `try/catch` for programmatic errors.

## Error Types

### `InvalidNavigationError`

Thrown when navigation cannot proceed: cancelled by enter/leave, no routes defined, push() called on a non-wildcard route.

```typescript
try {
  await this.nav.push('./child');
} catch (err) {
  if (err instanceof InvalidNavigationError) {
    // err.metadata.reason — "leave-callback" | "enter-callback" | "no-routes"
    // err.metadata.operation — "push" | "navigate" | "goto" | "link"
    // err.metadata.pathname — target path that failed
    // err.metadata.currentRoute — the Route that was active
  }
}
```

### `RouteNotFoundError`

Thrown when no route matches the target pathname. The catch-all `*` route prevents this — it always matches.

```typescript
try {
  await this.nav.navigate('/nonexistent');
} catch (err) {
  if (err instanceof RouteNotFoundError) {
    // err.metadata.targetPath — the path that didn't match
    // err.metadata.currentPathname — current location
  }
}
```

> **Note:** If you define a `*` catch-all route, `RouteNotFoundError` is never thrown. It only surfaces when the router has no fallback and the URL doesn't match any route.
