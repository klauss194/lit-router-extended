# 🏗️ Architectural Refactoring Report: `lit-router`

## Executive Summary
`lit-router` is an ambitious and feature-rich routing solution for Lit. It successfully ports advanced concepts from React Router (scoring, nested routes, memory state) into the Web Components ecosystem. 

However, from a first-principles perspective, the architecture currently conflates **routing state**, **route definitions**, and **DOM hierarchy**. This has led to the introduction of global variables (`globalThis`), brittle DOM-event-based dependency injection, and stateful definitions. 

To scale, become SSR-compatible, and improve developer experience, the library must decouple pure routing logic from Lit's component lifecycle.

---

## 🔬 First Principles Analysis

If we boil routing down to its fundamental truths, a router is simply a state machine that answers one question:
**Given a URL (State A) and a set of Rules (Configuration), what UI should be rendered (State B)?**

Based on this, we can derive four absolute engineering principles for a modern router:
1. **Route configurations are immutable.** They are the map, not the vehicle.
2. **The URL is the source of truth.** Not an internal variable.
3. **Hierarchy implies Context, not Events.** Trees communicate downwards via context, not upwards via custom DOM events.
4. **Standard Web APIs exist for URL parsing.** We should not write custom string parsers in 2024+.

Let's evaluate the codebase against these principles.

---

## 🚨 Critical Architectural Flaws

### 1. Stateful Route Objects (Violates Principle 1)
**File:** `Route.js`
Currently, the `Route` class stores the current match state directly on the configuration object:
```javascript
export class Route {
  params = {};
  searchParams = {};
  pathname = null;
  // ...
}
```
**Why this is a problem:** If a route config is reused, or if you attempt SSR (Server-Side Rendering), this state will leak across requests or components. A Route config should be a stateless definition.
**First Principles Fix:** Introduce a `RouteMatch` concept. The `Route` holds the rules, the `RouteMatch` holds the transient data (params, paths) for a specific navigation event.

### 2. The Global Singleton Anti-Pattern 
**Files:** `Router.js`, `Navigation.js`
The system relies on `globalThis.__lit_router_main`.
**Why this is a problem:** 
* It completely breaks Micro-Frontends (you cannot have two independent Lit apps on the same page).
* It breaks Server-Side Rendering (globals leak across user requests).
* It hides dependencies.
**First Principles Fix:** Use the official `@lit/context` package. The root `Router` should provide a context, and nested `RoutesControllers` or `Navigation` controllers should consume it.

### 3. Event-Based Dependency Injection (Violates Principle 3)
**Files:** `Navigation.js`, `RoutesController.js`, `RoutesEvents.js`
To figure out who their parent router is, controllers fire `lit-routes-acknowledge` or `lit-routes-connected` events, and parents catch them to register children.
**Why this is a problem:** In Shadow DOM, event retargeting and propagation rules make this incredibly fragile. If a router is inside an `ion-modal` (as mentioned in the code), DOM trees are detached, forcing you to use messy workarounds (like the `display: contents` wrapper in `outlet()`).
**First Principles Fix:** Again, `@lit/context`. It is designed specifically to pass data through Shadow DOM boundaries safely and synchronously without events.

### 4. Controller "God Object"
**File:** `RoutesController.js` (36,000+ bytes)
This class does too much:
* It is a Lit Reactive Controller.
* It manages an internal async queue (`_navigationId`).
* It traverses the DOM hierarchy.
* It renders HTML templates (`outlet()`).
* It executes user hooks (`enter`/`leave`).

### 5. Reinventing URL APIs (Violates Principle 4)
**File:** `util/url.js`
The code manually splits strings by `?` and `&` in `parseUrlComponents`. 
**Why this is a problem:** The browser has native, deeply tested `new URL(url, base)` and `URLSearchParams` APIs. Manual string manipulation is prone to edge-case bugs (e.g., encoded ampersands, multiple question marks).

---

## 🗺️ Refactoring Roadmap

To upgrade this library without losing its core features (push/pop, hooks, scoring), I recommend executing the following refactoring phases.

### Phase 1: Separate "Router Core" from "Lit Bindings"
Extract the pure routing logic into vanilla JS classes that have **zero dependency on Lit**. 

1. **`RouterCore`**: Manages `history`, URL parsing, and the central state (`currentURL`, `historyState`).
2. **`RouteMatcher`**: (Currently `ReactRouterScorer` + `getPattern`). A pure function/service that takes a URL and a Route Array and returns a `RouteMatch[]`.
3. **`LitBindings`**: `Router`, `Routes`, and `Navigation` controllers become lightweight wrappers that just listen to `RouterCore` and trigger `host.requestUpdate()`.

### Phase 2: Implement `@lit/context`
Remove all custom events (`RoutesConnectedEvent`, `RoutesAcknowledgeEvent`).

```javascript
// contexts.js
import { createContext } from '@lit/context';
export const routerContext = createContext('lit-router');
export const parentRouteContext = createContext('lit-parent-route');
```

Update `Navigation.js` to simply consume the context:
```javascript
import { ContextConsumer } from '@lit/context';

export class Navigation {
  constructor(host) {
    this.host = host;
    // Automatically grabs the router from the nearest provider in the DOM tree
    new ContextConsumer(this.host, {
      context: routerContext,
      subscribe: true,
      callback: (router) => { this.router = router; }
    });
  }
}
```

### Phase 3: Make Routes Stateless
Refactor the internal matching engine to produce transient "Match" objects.

**Before:**
```javascript
this._currentRoute.params = parsedRouteParams.params;
```

**After:**
```javascript
const match = {
  route: routeConfig,    // The stateless user definition
  params: parsedParams,  // Extract from URL
  searchParams: search,  // Extracted from URL
};
this._currentMatch = match;
```
When `outlet()` is called, it passes `match.params` to `match.route.render(match)`.

### Phase 4: Use Native URL APIs
Delete custom parsers in `util/url.js` and `pathjoin.js`.
Modern web routing should use the native `URL` interface. By establishing a mock origin (e.g., `http://router.local`), you can use the native `URL` object to handle all relative/absolute resolution natively.

```javascript
// Native, bug-free way to handle URL resolution and relative paths (./, ../)
const base = new URL(currentPath, 'http://local.app');
const target = new URL(newPath, base);

const searchParams = target.searchParams; // Native URLSearchParams
const hash = target.hash;
```

### Phase 5: Simplify Async Navigation Queue
The current `_gotoInternal` uses a complex `_navigationId` system to prevent race conditions. If you move the central state to a standalone `RouterCore` (Phase 1), you can use a standard async Mutex/Queue to ensure `enter/leave` hooks execute sequentially without interleaving states.

---

## 🎯 The "Ideal" API Target (Post-Refactor)

If the refactoring is successful, the developer experience remains almost identical, but the internals become rock solid.

```javascript
// 1. Core is agnostic and stateless
const coreRouter = new RouterCore({
  routes: [ ... ],
  fallback: () => html`404`
});

// 2. Lit integration is purely reactive
export class MyApp extends LitElement {
  // Provider sets up context for the whole app, NO globalThis
  router = new RouterProvider(this, coreRouter);

  render() {
    return this.router.outlet();
  }
}

// 3. Navigation uses Context under the hood, completely decoupled from events
export class MyComponent extends LitElement {
  nav = new Navigation(this);

  onClick() {
    // Navigates purely by delegating to the Context-provided router
    this.nav.push('./child', { searchParams: { tab: 1 } });
  }
}
```

## Summary Verdict
You have built a highly capable feature set. The `push`/`pop` memory state and React Router scoring system are excellent additions to Lit. 

By applying First Principles—specifically separating stateless data (Routes) from stateful instances (Matches), and using native Context API instead of DOM events—you will reduce the codebase size by ~30%, eliminate race conditions, and make the library SSR/Micro-Frontend ready.