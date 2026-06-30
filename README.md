# Lit-Router

Intuitive routing for Lit framework,made to be a faster, powerful and flexible route matching.

## Overview

`lit-router` is an advanced, hierarchical, client-side routing library built specifically for the Lit framework. It provides robust React-Router-style route scoring, nested routing, state memory management (`push`/`pop`), route guards (`enter`/`leave`), and reactive controllers for seamless integration into Lit elements.

## Core Architecture

1. **`Router`**: The root-level reactive controller. It manages `window.history`, intercepts global `popstate` events, and registers itself globally at `globalThis.__lit_router_main`. There should only be one `Router` per application.
2. **`RoutesController` (`Routes`)**: The base controller used for nested routing. It matches URL fragments, delegates unhandled tail paths to child routers, and renders the matched route using an outlet.
3. **`Navigation`**: A high-level reactive controller for imperative navigation. It discovers the active routing context via custom DOM events (`lit-routes-acknowledge`) and proxies commands to the root router while preserving context.
4. **`ReactRouterScorer`**: Calculates match specificity based on static segments, dynamic segments, optionals, and wildcards. It ensures the most specific route always matches first regardless of array order.

## Defining Routes

Routes are defined as an array of configuration objects passed to a `Router` or `RoutesController`:

```javascript
const routes = [
  { name: \"home\", path: \"/\", render: () => html`<h1>Home</h1>` },
  { name: \"user\", path: \"/user/:id\", render: (ctx) => html`<h1>User ${ctx.params.id}</h1>` },
  { name: \"optional\", path: \"/post/:id?\", render: (context) => html`<h1>Optional ID ${context.params.id || "None"}</h1>` },
  { name: \"nested\", path: \"/dashboard/*\", render: () => html`<my-dashboard></my-dashboard>` },
  { name: \"catchall\", path: \"/*\", render: () => html`<h1>404 Not Found</h1>` }
];
```

### Supported Path Syntaxes

- **Static**: `/about`
- **Dynamic**: `/user/:id`
- **Optional Segment**: `/user/:id?` or `/route/segment?`
- **Wildcard**: `/*` or `/folder/*`
- **Named Wildcard**: `/:restOfPath*`

> **⚠️ IMPORTANT LLM NOTE regarding `exact`**: The `exact: true` property is explicitly **NOT** supported or implemented by the scorer. Do not suggest or use `exact: true` in route configurations.

## Rendering Outlets

To render the current matched route, call the controller's `outlet()` method inside the host LitElement's `render` function:

```javascript
render() {
  return html`<main>${this._router.outlet()}</main>`;
}
```

This generates a `<lit-router-outlet>` wrapper that propagates lifecycle events down to nested child routes automatically.

## Contextual Navigation (`Navigation` Controller)

Instantiate `new Navigation(this)` controller in your Lit component to access contextual navigation methods.

### 1. `navigate(pathname, options)`

Navigates to an absolute or relative path.

```javascript
this.navigator.navigate("/dashboard/settings", {
  searchParams: { filter: "active" }, // URL query parameters (?filter=active)
  hash: "section1", // URL hash (#section1)
  extraParams: { hiddenState: true }, // Hidden state pushed to window.history.state
});
```

If you provide searchParams in `pathname` as string and `params.searchParams`, the ones in `pathname` takes precedence.

```javascript
// Example: If you provide searchParams in both the pathname string and params.searchParams,
// the searchParams in the pathname string take precedence.

this.navigator.navigate("/dashboard?filter=archived", {
  searchParams: { filter: "active", sort: "desc" },
});
// Resulting URL: /dashboard?filter=archived&sort=desc
// 'filter=archived' from the pathname overrides 'filter=active' in searchParams
```

**Semantics:**

- `navigate('/path', { searchParams: { x: '1' } })` → sets explicitly
- `navigate('/path', { searchParams: {} })` → clears explicitly
- `navigate('/path')` → keeps existing state
- `navigate('/path', { hash: 'top' })` → sets hash, keeps searchParams

**goto contract:**

- `pathname`: The target path to navigate to (string)
- `params`: Optional object with:
  - `searchParams`: Query parameters (object or URLSearchParams)
  - `extraParams`: Additional custom parameters
  - `hash`: Hash fragment

### 2. Hierarchical State (`push` and `pop`)

`Navigation` supports advanced memory management for sub-routing, allowing a child view to be pushed and later popped while seamlessly restoring the parent's previous URL state.

- **`push(pathname, options)`**: Navigates to a relative child path (the current route must end in a wildcard `*`). It saves the current `searchParams` and `hash` into a hidden `__back_context` state.
- **`pop(options)`**: Reverts to the parent route. By default (`ignoreSavedState: true`), it discards the saved context. Passing `ignoreSavedState: false` restores the parent's previous search params and hash.

```javascript
// In a child router, push to a nested view
await this.navigator.push("./settings", { searchParams: { tab: "profile" } });

// Later, pop back to the parent and restore the exact previous state
await this.navigator.pop({ ignoreSavedState: false });
```

### 3. State Accessors

The `Navigation` controller provides getters and setters for the current state:

- `this.navigator.params`: Aggregated URL path parameters from root to leaf.
- `this.navigator.searchParams`: Current query string parsed into a key-value object. Can be directly mutated via setter to update URL in-place.
- `this.navigator.hash`: Current hash fragment.

## Enter & Leave Guards (Hooks)

Routes can define `enter` and `leave` hooks to guard navigation. They can be sync or async. Returning `false` immediately aborts the navigation.

```javascript
{
  path: '/protected/:id',
  enter: async (context) => {
    const hasAccess = await checkAuth(context.params.id);
    return hasAccess; // false cancels navigation
  },
  leave: async (context) => {
    return confirm(\"You have unsaved changes. Leave?\");
  },
  render: (context) => html`<protected-view></protected-view>`
}
```

**The `context` object provided to hooks and render functions contains:**

- `params`: Extracted dynamic path parameters.
- `searchParams`: URL query parameters.
- `extraParams`: In-memory history state.
- `hash`: URL hash.

## Hardcoded redirection in `enter` hook

Routes that only redirect should declare their render hook but returning `null` or `nothing`.

```javascript
{
  path: '/home',
  enter: async (context) => {
    this.navigator.goto("/dashboard")
    return false;
  },
  render: () => null
}
```

## Dynamic Routing (Deprecated)

The library supports mutating the route table at runtime:

- `router.addRoute(routeObj, index?)`: Inserts a route and evaluates if it matches the current path immediately.
- `router.removeRoute(pathOrRoute)`: Removes an existing route.
- `router.setRoutes(routesArray)`: Entirely replaces the current route table.
- `router.clearRoutes(keepFallback)`: Wipes all configured routes.

## LLM Developer Guidelines

- Should only exist a declared `Router` instance that wraps the application.
- Always prefer using the `Navigation` reactive controller (`new Navigation(this)`) over interacting with `Router` directly for navigation commands.
- Nested routers (`RoutesController`) **must** correspond to a parent route ending with a wildcard (`/*`). The parent router will automatically propagate the remaining URL \"tail\" down to the child.
- State strictly belonging to the session memory should go in `extraParams`, while state intended to be bookmarkable should go into `searchParams`.
- Ignore the existence of `exact: true`. It is irrelevant for `lit-router`.
