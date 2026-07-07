---
id: router-api
name: Router API Reference
order: 1
---

## Router Instance

Access the root `Router` instance via `this.nav.router` (if using the Navigation controller) or `this._router` (from the owning component).

### Methods

- **`subscribe(callback)`**: Subscribes to route state changes. Returns an unsubscribe function.
- **`replaceState(options)`**: Updates the current URL's query string, hash, or extra state via `history.replaceState` *without* triggering navigation.
- **`buildUrl(pathname)`**: Constructs a full URL string for a given pathname, resolved against the current route.
- **`goto(pathname, options?)`**: Resolves a pathname and activates the matching route *without* updating the URL bar.
- **`navigate(pathname, options?)`**: Resolves a pathname, activates the matching route, and updates the URL bar via `history.pushState`.

## Custom Events

The `Router` dispatches events on `window` during navigation.

- **`lit-router-location-changing`**: Fires **before** navigation starts. Cancelable via `e.preventDefault()`. Detail: `{ currentPathname, pathname, extraParams, searchParams, hash }`.
- **`lit-router-location-changed`**: Fires **after** navigation completes. Detail: `{ pathname, params, extraParams, searchParams, hash }`.
- **`lit-router-error`**: Fires on `<a>` elements when an anchor click causes an error. Detail: `{ url, error }`.

## Error Types

- **`InvalidNavigationError`**: Thrown when navigation is cancelled by hooks, no routes are defined, or `push()` is called invalidly. Swallowed silently during `<a>` clicks.
- **`RouteNotFoundError`**: Thrown when no route matches the target pathname.
