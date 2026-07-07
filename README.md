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

---


## 1. Corrections to Existing Content

Specific adjustments to current pages. These do not add new content: they correct
errors, inconsistencies, and duplicates that have been detected.

| # | Issue | Location | Action |
|---|----------|-----------|--------|
| 1 | **Broken anchor link.** The deep link to *“Fires on the `<a>` element when an anchor click causes a non-`InvalidNavigationError`. Already covered in Anchor Links — use try/catch for programmatic errors»* does not resolve the issue. | *Router Instance API* → Custom Events / Error Handling section | Fix the anchor destination (correct ID) and verify that it points to the live section of *Anchor Links*. |
| 2 | **Column order reversed.** In the table, the column order is the reverse of the section title; both should match. | *Anchor Links* → **Programmatic vs. Anchor Navigation** | Reorder the columns to match the title’s order: *Programmatic* first, then *Anchor*. |
| 3 | **Duplicate table.** The *Path Pattern Reference* appears twice. | *Route Matching* / *Advanced Path Syntaxes* | Consolidate into **a single** table/section for route pattern references. |
| 4 | **Non-contiguous sections.** *Scoring in Practice* and *Scoring Priority* are separated even though they cover the same topic. | *Route Matching* + *Advanced Path Syntaxes* | Place them **next to each other** (see the *Explanation* section: “How route scoring works”). |
| 5 | **Repeated warning.** It is mentioned **twice** that *named wildcards* do not work with *nested routing*. | *Advanced Path Syntaxes* + *Nested Routing* | Place the warning in **a single** canonical location and reference it from the other. |

## Error handling

New section dedicated to the **efficient handling of predefined error types**:

- `InvalidNavigationError`
- `RouteNotFoundError`

Additionally, the **“Common Mistake”** section, which is currently located under *Nested Routing*, should
**be listed and explained here**, with a reference back to the original section
[*Nested Routing*](docs/nested-syntax.md) as the canonical source.

## 3. Diataxis Structure (Objective)

Complete reorganization based on the four Diataxis quadrants.

### 📘 Getting Started *(Tutorial — focused on learning)*

- **Installation**
- **Your First Router (Quickstart)** — taken from *Basic Setup* + *Rendering Outlets*.

### 🔧 Guides *(How-to — problem-solving)*

- **Nested Routing**
- **Guards / Lifecycle**
- **Anchor Links**
- **Route API — Push / Pop Patterns**

### 📖 Reference *(Information-oriented — for reference)*

- **Router Instance API**
- **Navigation Controller API**
- **Path Syntax**
- **Route configuration**

### 💡 Explanation *(Understanding-oriented — for understanding)*

- **How route scoring works** — combines *Scoring in Practice* + *Scoring Priority* (§1.4).
- **Tail propagation in nested routing**
- **The navigation lifecycle order**
- **`goto()` vs `navigate()`**

