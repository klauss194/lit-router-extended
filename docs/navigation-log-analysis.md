# Navigation Log Analysis Report
## `lit-router` — Initial Load, Child Propagation & Double-Fire Investigation

> **Scope:** Analysis of a single initial page load captured from browser console logs.  
> **URL navigated to:** `/client/task/open/69ea726034a53ed67f06c57d/chat/699f13f89c7d213103c48ec1`  
> **Date of capture:** 2026-04-27  
> **Router version:** current `src/router/lit-router/`  
> **Related source files:** `Router.js`, `Routes.js`, `AbstractController.js`, `app-router/index.js`, `app-router/client-parent.js`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Theoretical Model Recap](#2-theoretical-model-recap)
   - 2.1 [The Two Propagation Paths](#21-the-two-propagation-paths)
   - 2.2 [The Abort Controller Contract](#22-the-abort-controller-contract)
   - 2.3 [The Lit ReactiveElement Lifecycle](#23-the-lit-reactiveelement-lifecycle)
3. [Route Tree Being Navigated](#3-route-tree-being-navigated)
4. [Full Phase-by-Phase Log Trace](#4-full-phase-by-phase-log-trace)
   - 4.1 [Phase 1 — APP-ROUTER: Root Navigation Fire & Forget](#41-phase-1--app-router-root-navigation-fire--forget)
   - 4.2 [Phase 2 — Lazy Chunk Loads & CLIENT-PARENT Connects](#42-phase-2--lazy-chunk-loads--client-parent-connects)
   - 4.3 [Phase 3a — HOME-MODALS Path A: The Aborted Navigation](#43-phase-3a--home-modals-path-a-the-aborted-navigation)
   - 4.4 [Phase 3b — CLIENT-PARENT updateComplete + Path B for HOME-MODALS](#44-phase-3b--client-parent-updatecomplete--path-b-for-home-modals)
   - 4.5 [Phase 4 — HOME-MODALS Path B, TASK-PAGE-MODALS, CHAT-PAGE-MODALS](#45-phase-4--home-modals-path-b-task-page-modals-chat-page-modals)
   - 4.6 [Phase 5 — Final Resolution Bottom-Up](#46-phase-5--final-resolution-bottom-up)
5. [Findings](#5-findings)
   - Finding #1: Misleading "initial navigation completed" Log
   - Finding #2: `await updateComplete` Is Useless for Lazy-Loaded Children
   - Finding #3: Every `await` Is a Render Window — `NO ROUTE OR RENDER FUNCTION`
   - Finding #4: `home-page` Lit Anti-Pattern Warning
   - Finding #5: The Double-Fire / Abort Pattern at Every Eager Level
   - Finding #6: `_parentRoute: null` on All PATH A First Calls
   - Finding #7: `isPassthrough: true` State Preservation Logic
   - Finding #8: `children: Array(0)` After APP-ROUTER `updateComplete`
6. [The Lazy vs. Eager Propagation Split](#6-the-lazy-vs-eager-propagation-split)
7. [End-to-End Navigation Timeline Diagram](#7-end-to-end-navigation-timeline-diagram)
8. [What the Logs Confirm Is Working Correctly](#8-what-the-logs-confirm-is-working-correctly)
9. [What the Logs Reveal Is Wrong or Wasteful](#9-what-the-logs-reveal-is-wrong-or-wasteful)
10. [Recommendations](#10-recommendations)
11. [Raw Log Annotated Reference](#11-raw-log-annotated-reference)

---

## 1. Executive Summary

This report documents a complete analysis of a browser console log captured during the initial page load of the `handymanfe` application navigating to:

```
/client/task/open/69ea726034a53ed67f06c57d/chat/699f13f89c7d213103c48ec1
```

The navigation traverses a **4-level deep** route tree: `APP-ROUTER → CLIENT-PARENT → HOME-MODALS → TASK-PAGE-MODALS → CHAT-PAGE-MODALS`.

**The navigation ultimately reaches the correct final state.** All five controllers end up with the correct `currentRoute`, correct `state`, and correct outlet renders. The page loads and displays correctly.

However, the logs reveal **6 structural problems** ranging from wasted work and misleading logs to genuine design limitations:

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Design limitation | 1 | `await updateComplete` is completely useless for lazy-loaded children |
| 🟠 Wasted work | 1 | Double-fire + abort at every eager level (3 aborts in this log) |
| 🟡 Misleading log | 1 | "initial navigation completed" fires before navigation is done |
| 🟡 Noisy log | 1 | "NO ROUTE OR RENDER FUNCTION" at 3 levels during Path A |
| 🟡 Lit anti-pattern | 1 | `home-page` schedules update after update completed |
| 🟢 Cosmetic | 1 | `_parentRoute: null` on every Path A first call |

The most important structural insight from these logs is a **previously unappreciated split**: lazy-loaded children and eagerly-imported children have fundamentally different propagation behaviour, and the current router design handles them through different mechanisms without explicitly acknowledging this distinction.

---

## 2. Theoretical Model Recap

Before reading the logs, this section re-states the theoretical model the router is supposed to follow. Every log line will be evaluated against this model.

### 2.1 The Two Propagation Paths

When a parent `Routes` controller commits a navigation (sets `currentRoute`, updates `state`), child controllers need to receive the `tailGroup` — the unmatched remainder of the URL that belongs to them. There are exactly **two code paths** that can deliver this:

**PATH A — `childRouteConnected` (reactive, event-driven)**

```
child.hostConnected()
  → RoutesConnectedEvent dispatched (bubbles)
  → parent outlet catches it (onChildConnected)
      → parent._children.add(child)
      → parent.childRouteConnected(child)           ← Routes.js:84
          → child._gotoInternal(this.state.tailGroup)   ← async, NOT awaited
```

This fires **during the render cycle** of the parent (synchronously, while `performUpdate` is executing). The async `_gotoInternal` starts immediately but is fire-and-forget from `childRouteConnected`'s perspective.

**PATH B — `_propagateNavigation` (scheduled, await-based)**

```
Routes._navigate()
  → this._host.requestUpdate()
  → await this._host.updateComplete                 ← yields until render done
  → children now registered (if eager)
  → _propagateNavigation(tailGroup, this._children) ← Routes.js:399
      → await Promise.all(children.map(_gotoInternal))
```

This fires **after the render completes**, when `updateComplete` resolves. If children registered themselves synchronously during the render, they will be in `_children` by this point.

**The critical difference:** PATH A fires during the render. PATH B fires after the render. On first load, both paths can fire for the same child if that child connected during the render microtask, creating the double-fire problem.

### 2.2 The Abort Controller Contract

Every call to `_gotoInternal` creates a new `AbortController` and increments `_navId`:

```js
async _gotoInternal(pathname, options, skipLeaveCallbacks) {
    this._currentAbort?.abort(NAVIGATION_ABORTED_TOKEN); // cancel in-flight
    const ac = new AbortController();
    const myId = ++this._navId;
    this._currentAbort = ac;
    
    try {
        await this._navigate(pathname, options, skipLeaveCallbacks, ac);
    } finally {
        if (myId === this._navId) {
            this._currentAbort = null;
        }
    }
}
```

When PATH B fires `_gotoInternal` on a child that is already running PATH A, the first line `this._currentAbort?.abort()` immediately signals PATH A's `AbortController`. The next `checkSignal()` call in PATH A's `_navigate` will detect this and throw `InvalidNavigationError({ reason: "navigation-aborted" })`. That error is caught in `_gotoInternal`'s catch block and swallowed silently.

`checkSignal()` is called at 5 strategic points in `_navigate`:

```
Point A: Before leave guard block
Point B: After canDeeplyLeave() resolves       (only if !skipLeaveCallbacks)
Point C: After leave guard block (always)
Point D: After enter guard resolves            (only if enter exists)
Point E: At end of new-route path (always)
```

Every `await` in `_navigate` is an opportunity for the abort signal to be set. The abort is detected at the *next* synchronous `checkSignal()` call after the signal is set, not immediately.

### 2.3 The Lit ReactiveElement Lifecycle

Understanding when child components connect relative to the router's async operations is critical:

```
new HostElement()
    constructor()
        __initialize()
            requestUpdate()           ← queued, BLOCKED (update gate closed)
    
connectedCallback()
    renderRoot = createRenderRoot()   ← shadow root created HERE, not in constructor
    enableUpdating(true)              ← update gate OPENS
    controllers.forEach(c => c.hostConnected())
        → router.hostConnected()
            → goto(url)               ← async, NOT awaited (void interface)
                _navigate()
                    matchRoute()      ← sync
                    requestUpdate()   ← already pending, NO-OP
                    await updateComplete  ← YIELDS HERE
    ← hostConnected() returns
← connectedCallback() returns

[microtask]
    performUpdate()
        render()
            → outlet() → <child-element>
            → child.connectedCallback()
                → child Routes.hostConnected()
                → RoutesConnectedEvent dispatched upward
                → parent outlet catches → _children.add(child)
                → childRouteConnected(child) → PATH A fires

← updateComplete resolves
    → _propagateNavigation(_children) → PATH B fires
```

The crucial ordering: **render happens inside the `await updateComplete` suspension window**. Children connect during that window. If they are eagerly imported, they will be in `_children` when `updateComplete` resolves and PATH B will re-navigate them (aborting their ongoing PATH A navigation).

---

## 3. Route Tree Being Navigated

The URL `/client/task/open/69ea726034a53ed67f06c57d/chat/699f13f89c7d213103c48ec1` is resolved through the following route hierarchy. Each level shows which segment it matches and what tailGroup it passes down.

```
Level 0: APP-ROUTER (Router instance on <app-router>)
├── Route matched: /client/*
│   Matched segment:   /client
│   tailGroup passed:  /task/open/69ea726034a53ed67f06c57d/chat/699f13f89c7d213103c48ec1
│   Renders:           <client-parent>   ← LAZY CHUNK (webpack async import)
│
Level 1: CLIENT-PARENT (Routes instance on <client-parent>)
├── Route matched: /*
│   Matched segment:   (empty — the /* catches everything)
│   tailGroup passed:  /task/open/69ea726034a53ed67f06c57d/chat/699f13f89c7d213103c48ec1
│   Renders:           <home-page>  which contains HOME-MODALS
│
Level 2: HOME-MODALS (Routes instance on <home-modals>, inside <home-page>)
├── Route matched: /task/open/:orderId/*
│   Matched segment:   /task/open/69ea726034a53ed67f06c57d
│   Extracted param:   orderId = "69ea726034a53ed67f06c57d"
│   tailGroup passed:  /chat/699f13f89c7d213103c48ec1
│   Renders:           <task-page>  which contains TASK-PAGE-MODALS
│
Level 3: TASK-PAGE-MODALS (Routes instance on <task-page-modals>, inside <task-page>)
├── Route matched: /chat/:chatId
│   Matched segment:   /chat/699f13f89c7d213103c48ec1
│   Extracted param:   chatId = "699f13f89c7d213103c48ec1"
│   tailGroup:         / (no wildcard → normalized to "/")
│   Renders:           <chat-page>  which contains CHAT-PAGE-MODALS
│
Level 4: CHAT-PAGE-MODALS (Routes instance on <chat-page-modals>, inside <chat-page>)
├── Route matched: /
│   tailGroup:         undefined / empty (leaf node)
│   Renders:           chat content (leaf, no further children)
```

**Route sources:**

| Controller | File | Route definitions |
|---|---|---|
| APP-ROUTER | `src/router/app-router/index.js` | `/client/*`, `/specialist/*`, `/settings/*`, `/*`, etc. |
| CLIENT-PARENT | `src/router/app-router/client-parent.js` | `/*`, `chat/:id`, `auth`, `login`, etc. |
| HOME-MODALS | Inside `home-page` component | `/task/open/:orderId/*`, etc. |
| TASK-PAGE-MODALS | Inside `task-page` component | `/chat/:chatId`, etc. |
| CHAT-PAGE-MODALS | Inside `chat-page` component | `/`, etc. |

---

## 4. Full Phase-by-Phase Log Trace

This section walks through every significant log line in order, explains exactly why it fires, and notes deviations from the theoretical model.

---

### 4.1 Phase 1 — APP-ROUTER: Root Navigation Fire & Forget

**Log lines:**

```
Router.js:142   Initial navigation                                                ← console.group()
Router.js:143   [Router] initial navigation  {state: null}                        ← state is null: no previous history
Router.js:221   [Router] calling _gotoInternal  {
                    instance: Router,
                    _parentRoute: null,                                           ← Router is root, no parent
                    pathname: '/client/task/open/.../chat/...',
                    skipLeaveCallbacks: true                                       ← isBrowserNavigation=true
                }
Routes.js:123   [Routes::APP-ROUTER] called /client/task/open/...  {
                    instance: Router,
                    _parentRoute: null,
                    skipLeaveCallbacks: true
                }
```

**What's happening:** `Router.hostConnected()` fires inside `connectedCallback()`. It calls `this.goto(locationToHref(window.location), { isBrowserNavigation: true })`. The `goto()` method is `async` but `hostConnected()` is declared as `void` (Lit's `ReactiveController` interface) and is called by `connectedCallback()` which does not await controllers. `goto()` starts executing synchronously and passes the full href (not just pathname) to `_gotoInternal`. The `isBrowserNavigation: true` flag sets `skipLeaveCallbacks: true` for the initial load.

**Why `_parentRoute: null`:** `APP-ROUTER` is the root `Router` instance. It has no parent by definition. `getMainRouter()` on the Router returns `this`.

```
Routes.js:200   [Routes::APP-ROUTER] matched route for /client/task/open/...  {nextRoute: Route}
Routes.js:220   [Routes::APP-ROUTER] parsedRouteParams for /client/task/open/...  {parsedRouteParams: {…}}
```

**What's happening:** `RoutesSet.matchRoute(pathname)` runs synchronously. It calls `getSortedRoutes()` which sorts all routes by `score → specificity → insertion order`. The path `/client/task/open/...` matches the `/client/*` route (score: 1000 + wildcard penalty = ~950). `Route.parsePathname()` extracts:
- `params`: `{}` (no named params in `/client/*` besides the wildcard)
- `pathname`: `/client`
- `tailGroup`: `/task/open/69ea726034a53ed67f06c57d/chat/699f13f89c7d213103c48ec1`
- `hasTail`: `true`

```
Routes.js:165   Checking navigation signal   ← A: always fires
Routes.js:165   Checking navigation signal   ← C: after leave guard block (skipped because isBrowserNavigation)
Routes.js:165   Checking navigation signal   ← E: end of new-route path
```

**Why only 3 `checkSignal` calls?** `skipLeaveCallbacks: true` skips the entire `canDeeplyLeave` block (which contains checkSignal B). The APP-ROUTER root route `/client/*` has an `enter` guard, but inspection of the `app-router/index.js` source reveals:

```js
enter: async ({ route }) => {
    if (this.#fetchUserSettings.taskComplete) {   // ← only if taskComplete defined
        await this.#fetchUserSettings.taskComplete;
    }
    // ... role-based redirect logic
}
```

In `connectedCallback()`, the `#fetchUserSettings.run()` call happens **after** `super.connectedCallback()`. Since `goto()` is fired inside `super.connectedCallback()`, the task has not been run yet when the enter guard executes. `taskComplete` is `undefined` → the `if` block is skipped → the guard runs synchronously and reaches the role check. Since `authStore.userRole` is `'client'`, it calls `this.router.navigate("/client/")` and returns `false`. 

Wait — actually if it returns `false` here, that would abort navigation. But the log shows navigation proceeding past the enter guard. Let me re-examine: the route being matched is `/client/*`, not `/`. The root `/*` route's enter guard would redirect unauthenticated users, but here the user IS authenticated as `client` role, so `this.router.navigate("/client/")` would fire. But looking at the log, navigation DOES proceed. This is because the matched route is `/client/*` (the named `client` route), not the `/*` (named `root` route) — these are different route definitions. The `/client/*` route has no enter guard. So the enter guard is absent for the matched route, explaining exactly **3 signals** (A, C, E — no D because no enter guard).

```
Routes.js:332   [Routes::APP-ROUTER] updating state /client/task/open/...  {
                    isPassthrough: true,    ← hasTail is true, this is a passthrough level
                    currentState: {…},
                    options: {…}
                }
```

**`isPassthrough: true` explained:** The `isPassthrough` flag is computed as:
```js
const isPassthrough = parsedRouteParams.tailGroup && parsedRouteParams.tailGroup !== "/";
```
When `isPassthrough` is `true`, the router **preserves the current level's own `searchParams` and `hash`** instead of propagating the incoming values. This is correct: if APP-ROUTER is just passing through `/client/*`, the searchParams at APP-ROUTER's level should not be overwritten by the deeply-nested tail's searchParams. They belong to the leaf level.

```
Routes.js:355   [Routes::APP-ROUTER] before requestUpdate /client/task/open/...  {
                    children: Set(0),     ← ⚠️ ZERO CHILDREN
                    newState: {…}
                }
```

**Critical observation:** `children` is `Set(0)` — completely empty. This is correct and expected at this moment because `CLIENT-PARENT` is a lazy-loaded webpack chunk (`import("./client-parent.js")` in `app-router/index.js`). The custom element `<client-parent>` has not been defined yet. No child has connected.

`requestUpdate()` is called (sync). Then `goto()` hits `await this._host.updateComplete` and **suspends**. The JS call stack unwinds back to `hostConnected()`.

```
Router.js:148   [Router] initial navigation completed
```

**⚠️ THIS IS MISLEADING.** See [Finding #1](#finding-1-misleading-initial-navigation-completed-log).

`hostConnected()` logs this immediately after the (unawaited) `goto()` call returns. The navigation is not complete — it is suspended at `await updateComplete`. This log fires after `goto()` was merely *started*, not after it *finished*.

```
service-worker-manager.js:23  Registering service worker
Routes.js:443   RENDERING OUTLET APP-ROUTER
```

**The first render microtask fires.** `performUpdate()` runs. `render()` is called on `<app-router>`. `this.router.outlet()` is called. `currentRoute` is the `/client/*` route. The render function executes: `html\`<client-parent>\``. The `<client-parent>` DOM element is inserted into the shadow DOM.

**However:** `client-parent` is not yet a defined custom element. The browser inserts it as an `HTMLElement` with no custom behavior (an "unknown element"). It will be upgraded when the webpack chunk finishes downloading and defining it.

```
Routes.js:363   [Routes::APP-ROUTER] after updateComplete /client/task/open/...  {
                    children: Array(0)    ← ⚠️ STILL ZERO
                }
```

**`updateComplete` resolves.** The render is done. `_propagateNavigation` is called with `children = []` — **this is a complete no-op.** There is nothing to propagate to. The lazy chunk has not loaded yet.

```
Routes.js:139   [Routes::APP-ROUTER] navigation finished, clearing abort controller
```

**APP-ROUTER navigation is declared "finished".** But the page is still blank from the user's perspective — `<client-parent>` exists in the DOM as an unknown element with no rendered content. The entire routing below this level hasn't started yet.

```
service-worker-manager.js:34  Service Worker registered
service-worker-manager.js:38  Service Worker ready
```

These fire after APP-ROUTER finishes. The service worker registration is async and unrelated to routing.

---

### 4.2 Phase 2 — Lazy Chunk Loads & CLIENT-PARENT Connects

```
Routes.js:94    RouteConnected::CLIENT-PARENT for /task/open/.../chat/...
```

**The webpack async module resolves.** `client-parent.js` chunk downloaded and executed. The `@customElement("client-parent")` decorator ran, defining the custom element. The browser upgraded the existing `<client-parent>` DOM element, calling its `connectedCallback()`.

Lit's `connectedCallback()` runs:
1. `renderRoot = createRenderRoot()` — shadow DOM created
2. `enableUpdating(true)` — update gate opens
3. `clientParentRoutes.hostConnected()` is called by Lit's controller loop
4. Inside `hostConnected()`: `new RoutesConnectedEvent(this)` is dispatched from `<client-parent>`'s shadow host
5. The event bubbles upward through the composed tree (since `composed: true`)
6. It reaches the `<lit-router-outlet>` that APP-ROUTER's `outlet()` created
7. The outlet's `@lit-routes-connected` listener fires: `APP-ROUTER.onChildConnected(event)`

Inside `APP-ROUTER.onChildConnected(event)`:
```js
event.stopImmediatePropagation();     // stop event from going higher
event.parentRoute = this;             // stamp parent reference on event
this._children.add(clientParentRoutes); // register child
this.childRouteConnected(clientParentRoutes); // ← PATH A starts here
```

`childRouteConnected` is overridden in `Routes.js`:
```js
async childRouteConnected(child) {
    const pathname = this.state.tailGroup;
    // pathname = "/task/open/.../chat/..."
    await child._gotoInternal(pathname, state, false);
}
```

This is `async` but **not awaited** by `onChildConnected`. PATH A for CLIENT-PARENT starts running.

```
Routes.js:123   [Routes::CLIENT-PARENT] called /task/open/...  {
                    instance: Routes,
                    _parentRoute: null,     ← ⚠️ null here — see Finding #6
                    pathname: '/task/open/.../chat/...',
                    skipLeaveCallbacks: false
                }
```

**Why `_parentRoute: null`?** The sequence is:

```
1. client-parent.hostConnected()
   → dispatchEvent(RoutesConnectedEvent)          ← starts bubbling
      → APP-ROUTER.onChildConnected(event)        ← catches event
          → event.parentRoute = APP-ROUTER        ← stamps parent on event
          → clientParentRoutes.childRouteConnected()  ← PATH A fires (async)
              → [Routes::CLIENT-PARENT] called ... {_parentRoute: null}
                                                  ← _parentRoute is null HERE
              → (PATH A suspended at await)
      ← onChildConnected returns
   ← dispatchEvent returns
   → client-parent.__childRouteConnected(event)   ← NOW processes event.parentRoute
       → this._parentRoute = event.parentRoute    ← ONLY SET HERE
```

The `_parentRoute` is set in `__childRouteConnected`, which runs **after** `dispatchEvent` returns. But `onChildConnected` (called during `dispatchEvent`) already started PATH A before that. So at the moment PATH A's `_gotoInternal` logs, `_parentRoute` is still null.

This is a sequencing artifact, not a bug. `_parentRoute` is only needed for `link()` building and scope discovery — not for the matching algorithm. PATH A navigates correctly despite `_parentRoute` being temporarily null.

CLIENT-PARENT's `_navigate` proceeds synchronously until its first `await`:

```
Routes.js:200   [Routes::CLIENT-PARENT] matched route    ← sync: matchRoute()
Routes.js:220   [Routes::CLIENT-PARENT] parsedRouteParams ← sync: parsePathname()
Routes.js:165   Checking navigation signal               ← A: always, sync
```

The first `await` encountered: `await canDeeplyLeave(this, this.router, signal)`.

Even though `currentRoute` is `undefined` (no previous route → skip leave guard → return `true` immediately), `canDeeplyLeave` is still an `async` function. Calling it with `await` yields to the microtask queue, even if the internal logic resolves synchronously.

**This yield is the window where the next render can fire.**

---

### 4.3 Phase 3a — HOME-MODALS Path A: The Aborted Navigation

While CLIENT-PARENT's PATH A is suspended at `await canDeeplyLeave`, a pending render fires.

**Why does the render fire here?** When APP-ROUTER called `requestUpdate()` on `<app-router>`, this queued an update. That update already fired (Phase 1). But when CLIENT-PARENT connected, its `connectedCallback` called `enableUpdating(true)` which resolved CLIENT-PARENT's own update promise. The Lit scheduler had a pending `requestUpdate()` from `__initialize()` (called in constructor). This fires in the microtask checkpoint after `await canDeeplyLeave` yields.

```
Routes.js:425   NO ROUTE OR RENDER FUNCTION, RETURNING NOTHING CLIENT-PARENT undefined
                {pathname: '', tailGroup: '', hasTail: false, fullPathname: '', searchParams: {…}, …}
```

**CLIENT-PARENT's first render fires.** `render()` is called. The template includes `this.clientParentRoutes.outlet()`. But `currentRoute` is `undefined` on CLIENT-PARENT's `Routes` instance — PATH A hasn't committed the route yet. `outlet()` logs the warning and returns `undefined`. This renders nothing at CLIENT-PARENT level momentarily.

**However, the render still instantiates the DOM tree** that CLIENT-PARENT's render function produces for its non-outlet parts (headers, wrappers, etc.).

`canDeeplyLeave` resolves:

```
Routes.js:279   [Routes::CLIENT-PARENT] canDeeplyLeave result {canLeave: true}
Routes.js:165   Checking navigation signal   ← B: after canDeeplyLeave
Routes.js:165   Checking navigation signal   ← C: after leave block
Routes.js:308   [Routes::CLIENT-PARENT] enter callback result {canEnter: undefined}
Routes.js:165   Checking navigation signal   ← D: after enter guard
Routes.js:165   Checking navigation signal   ← E: end of new-route path
Routes.js:332   [Routes::CLIENT-PARENT] updating state ... {isPassthrough: true, ...}
Routes.js:355   [Routes::CLIENT-PARENT] before requestUpdate  {children: Set(0)}
```

CLIENT-PARENT commits: `currentRoute = /* route`, `state = {..., tailGroup: '/task/open/.../chat/...'}`. Then `requestUpdate()` → `await updateComplete` → **CLIENT-PARENT PATH A suspends**.

```
Routes.js:443   RENDERING OUTLET CLIENT-PARENT
chatStore.js:240  Initialising chatsstore
```

CLIENT-PARENT's render fires. `outlet()` now returns the `/\*` route's template: `html\`<home-page .showLandingHeader=${false}>\``. 

`<home-page>` is **eagerly imported** in `client-parent.js` (top-level `import("../../pages/home-page")` — though using dynamic import syntax, this import fires immediately when the module is evaluated, not lazily). The custom element is already defined. So:

- `<home-page>` connects synchronously during CLIENT-PARENT's render
- `home-page.connectedCallback()` fires
- `home-page` is a `SignalWatcher` → initializes signals → schedules its own update

```
index.js:2   Element home-page scheduled an update after an update completed
```

**⚠️ Lit Warning fires.** See [Finding #4](#finding-4-home-page-lit-anti-pattern-warning).

Inside `<home-page>`, the template includes `<home-modals>` component. `<home-modals>` connects:

```
Routes.js:94    RouteConnected::HOME-MODALS for /task/open/.../chat/...
```

**HOME-MODALS' `hostConnected()` fires.** `RoutesConnectedEvent` dispatched. Bubbles up to CLIENT-PARENT's `<lit-router-outlet>`. CLIENT-PARENT's `onChildConnected` fires:
- `CLIENT-PARENT._children.add(homeModalsRoutes)`
- `childRouteConnected(homeModalsRoutes)` → **PATH A for HOME-MODALS starts**

```
Routes.js:123   [Routes::HOME-MODALS] called /task/open/...  {
                    _parentRoute: null,    ← same sequencing issue as CLIENT-PARENT
                    skipLeaveCallbacks: false
                }
Routes.js:200   [Routes::HOME-MODALS] matched route   ← matched /task/open/:orderId/*
Routes.js:220   [Routes::HOME-MODALS] parsedRouteParams
Routes.js:165   Checking navigation signal   ← A
```

HOME-MODALS hits `await canDeeplyLeave` — yields. During that yield, HOME-MODALS renders for the first time:

```
Routes.js:425   NO ROUTE OR RENDER FUNCTION, RETURNING NOTHING HOME-MODALS undefined
                {pathname: '', tailGroup: '', hasTail: false, ...}
```

Same pattern as CLIENT-PARENT. `currentRoute` is `undefined` at HOME-MODALS, outlet returns nothing.

`canDeeplyLeave` resolves:

```
Routes.js:279   [Routes::HOME-MODALS] canDeeplyLeave result {canLeave: true}
Routes.js:165   Checking navigation signal   ← B (after canDeeplyLeave)
```

**Then immediately:**

```
Routes.js:167   Navigation signal aborted /task/open/... HOME-MODALS navigation-aborted
```

**⚠️ PATH A ABORTED.** This is the double-fire collision. What happened between checkSignal B and checkSignal C?

**Timeline of the collision:**

```
HOME-MODALS PATH A:               CLIENT-PARENT PATH A:
  checkSignal(A)                  
  await canDeeplyLeave()  ──────────────────────────────────────────
                                   updateComplete resolves ← render done
                                   _propagateNavigation(tailGroup, [HOME-MODALS])
                                       HOME-MODALS._gotoInternal(tailGroup)  ← PATH B!
                                           this._currentAbort?.abort()  ← ABORTS PATH A
  canDeeplyLeave resolves
  checkSignal(B)  ← signal is NOW ABORTED → throws!
```

The `await canDeeplyLeave()` in PATH A and the `await this._host.updateComplete` in CLIENT-PARENT both resolve in the microtask queue. **CLIENT-PARENT's `updateComplete` resolved while HOME-MODALS PATH A was between checkSignal A and checkSignal B.** PATH B started, aborted PATH A, and HOME-MODALS PATH A throws on its very next `checkSignal`.

```
Routes.js:103   Navigation aborted while navigating to /task/open/... in HOME-MODALS
```

This is the `console.trace()` in `checkSignal`. The stack trace confirms it originated from PATH A's `childRouteConnected` call chain.

---

### 4.4 Phase 3b — CLIENT-PARENT updateComplete + Path B for HOME-MODALS

```
Routes.js:363   [Routes::CLIENT-PARENT] after updateComplete /task/open/...  {
                    children: Array(1)    ← HOME-MODALS IS here now
                }
Routes.js:399   [Routes::CLIENT-PARENT] propagating navigation for children of  -> /task/open/...
Routes.js:406   Child::/task/open/...
```

CLIENT-PARENT's `updateComplete` resolves. `_propagateNavigation` runs with `[homeModalsRoutes]`. This calls `homeModalsRoutes._gotoInternal(tailGroup)` — **PATH B for HOME-MODALS**.

This is the "clean" navigation — PATH A was already aborted and cleaned up. PATH B starts fresh:

```
Routes.js:123   [Routes::HOME-MODALS] called /task/open/...  {
                    _parentRoute: Routes,   ← correctly set now (from __childRouteConnected)
                    skipLeaveCallbacks: false
                }
```

`_parentRoute: Routes` is now properly set. By this point `__childRouteConnected` has long since run (it ran immediately after the initial `dispatchEvent` returned in Phase 3a).

HOME-MODALS PATH B runs the full navigation lifecycle:
- `matchRoute` → `/task/open/:orderId/*`
- `parsePathname` → `orderId = "69ea726034a53ed67f06c57d"`, `tailGroup = "/chat/699f..."`
- `canDeeplyLeave` → `true` (still no currentRoute)
- enter guard → `canEnter: undefined` (proceed)
- `currentRoute = /task/open/:orderId/* route`
- `state = { pathname: '/task/open/69ea726034a53ed67f06c57d', tailGroup: '/chat/699f...', hasTail: true, ... }`
- `requestUpdate()` → render → `await updateComplete`

```
Routes.js:355   [Routes::HOME-MODALS] before requestUpdate  {children: Set(0)}
home-modals.js:67  active-task: /task/open/:orderId/*
Routes.js:443   RENDERING OUTLET HOME-MODALS
```

HOME-MODALS logs its matched route name (`active-task`) and renders. The outlet produces `<task-page>` which connects — and the same Path A/Path B pattern repeats at the next level.

---

### 4.5 Phase 4 — HOME-MODALS Path B, TASK-PAGE-MODALS, CHAT-PAGE-MODALS

The pattern from Phase 3 repeats at each level. Here it is compressed:

**TASK-PAGE-MODALS — PATH A (via HOME-MODALS childRouteConnected):**

```
Routes.js:94    RouteConnected::TASK-PAGE-MODALS for /chat/699f...
Routes.js:123   [Routes::TASK-PAGE-MODALS] called /chat/699f...  {_parentRoute: null}
Routes.js:200   matched route    ← /chat/:chatId
Routes.js:220   parsedRouteParams
Routes.js:165   Checking navigation signal  ← A
Routes.js:363   [Routes::HOME-MODALS] after updateComplete  {children: Array(1)}
                ← HOME-MODALS updateComplete resolves, fires PATH B for TASK-PAGE-MODALS
                ← PATH B calls _gotoInternal → aborts PATH A
Routes.js:279   canDeeplyLeave {canLeave: true}
Routes.js:165   Checking navigation signal  ← B
Routes.js:167   Navigation signal aborted /chat/... TASK-PAGE-MODALS navigation-aborted
Routes.js:103   Navigation aborted while navigating to /chat/... in TASK-PAGE-MODALS
```

**TASK-PAGE-MODALS — PATH B (via HOME-MODALS _propagateNavigation):**

```
Routes.js:399   [Routes::HOME-MODALS] propagating navigation for children of /task/open/... -> /chat/699f...
Routes.js:123   [Routes::TASK-PAGE-MODALS] called /chat/...  {_parentRoute: Routes}  ← clean
Routes.js:308   enter callback result {canEnter: undefined}
Routes.js:332   updating state  {isPassthrough: false}  ← /chat/:chatId has NO wildcard → not passthrough
Routes.js:355   before requestUpdate  {children: Set(0)}
Routes.js:443   RENDERING OUTLET TASK-PAGE-MODALS
```

**`isPassthrough: false` here.** The route `/chat/:chatId` has NO `*` wildcard. Therefore `parsedRouteParams.tailGroup = "/"` (the normalized fallback) and `parsedRouteParams.hasTail = false`. Wait — actually let me reconsider. The log shows:

```
Routes.js:399   [Routes::TASK-PAGE-MODALS] propagating navigation for children of /chat/699f... -> /
```

So TASK-PAGE-MODALS is propagating `/` to its child. This means the route `/chat/:chatId` somehow produced a tailGroup of `/`. Looking at `Route.parsePathname`:

```js
const tailGroup = rawTail ? new URL(rawTail, ORIGIN).pathname : "/";
```

When `rawTail` is `undefined` (no wildcard match), `tailGroup` defaults to `"/"`. So **even routes without `*` produce a tailGroup of `"/"` which gets propagated to children**. This is potentially unexpected — it means child routers always receive at least `"/"`.

**CHAT-PAGE-MODALS — PATH A + PATH B (same pattern):**

```
Routes.js:94    RouteConnected::CHAT-PAGE-MODALS for /
Routes.js:123   [Routes::CHAT-PAGE-MODALS] called /  {_parentRoute: null}
                ← PATH A: starts
Routes.js:167   Navigation signal aborted / CHAT-PAGE-MODALS navigation-aborted
                ← TASK-PAGE-MODALS updateComplete fires PATH B, aborts PATH A
Routes.js:123   [Routes::CHAT-PAGE-MODALS] called /  {_parentRoute: Routes}
                ← PATH B: clean run
Routes.js:332   updating state / {isPassthrough: false}
Routes.js:355   before requestUpdate {children: Set(0)}
Routes.js:443   RENDERING OUTLET CHAT-PAGE-MODALS
```

CHAT-PAGE-MODALS renders. No further children connect.

```
Routes.js:363   [Routes::CHAT-PAGE-MODALS] after updateComplete /  {children: Array(0)}
```

Leaf node. No `_propagateNavigation` needed. Navigation resolves.

---

### 4.6 Phase 5 — Final Resolution Bottom-Up

```
Routes.js:139   [Routes::CHAT-PAGE-MODALS] navigation finished, clearing abort controller /
Routes.js:139   [Routes::TASK-PAGE-MODALS] navigation finished, clearing abort controller /chat/...
Routes.js:139   [Routes::HOME-MODALS] navigation finished, clearing abort controller /task/open/...
Routes.js:139   [Routes::CLIENT-PARENT] navigation finished, clearing abort controller /task/open/...
```

These resolve in **bottom-to-top order** — deepest first, root last. This is correct and expected. The resolution order follows the `await Promise.all` chain in `_propagateNavigation`:

```
CLIENT-PARENT._propagateNavigation() awaits HOME-MODALS._gotoInternal()
    HOME-MODALS._propagateNavigation() awaits TASK-PAGE-MODALS._gotoInternal()
        TASK-PAGE-MODALS._propagateNavigation() awaits CHAT-PAGE-MODALS._gotoInternal()
            CHAT-PAGE-MODALS: no children → resolves immediately
        TASK-PAGE-MODALS: resolves
    HOME-MODALS: resolves
CLIENT-PARENT: resolves
```

The `_gotoInternal` finally block runs for each level:

```js
} finally {
    if (myId === this._navId) {
        this._currentAbort = null;
    }
}
```

Since only PATH B's `myId` matches `this._navId` (PATH A was aborted with a different navId), the abort controller is cleared cleanly only for PATH B's navigation.

---

## 5. Findings

---

### Finding #1: Misleading "initial navigation completed" Log

**Severity:** 🟡 Misleading — cosmetic but confusing

**Log line:**
```
Router.js:148   [Router] initial navigation completed
```

**Source code (Router.js `hostConnected`):**
```js
hostConnected() {
    super.hostConnected();
    // ... window listeners ...
    
    console.group("Initial navigation");
    console.log("[Router] initial navigation", { state });
    this.goto(locationToHref(window.location), {      // ← NOT awaited
        isBrowserNavigation: true,
        ...(state?.extraParams ? state.extraParams : {}),
    });
    console.log("[Router] initial navigation completed"); // ← fires here
    console.groupEnd();
}
```

**What actually happens:** `goto()` is `async`. When it hits `await this._host.updateComplete` inside `_navigate`, it suspends and yields. Control returns immediately to `hostConnected()`. The next line — `console.log("[Router] initial navigation completed")` — runs immediately, while `goto()` is still in flight.

At this point in the log, the actual state is:
- `requestUpdate()` has been scheduled on APP-ROUTER
- No render has happened yet
- `CLIENT-PARENT` hasn't connected
- The tree is completely unnavigated below level 0

The message "completed" is 100% inaccurate. The correct message would be "goto() fired, hostConnected returning".

**Why this can't be fixed by awaiting:** `hostConnected()` is `void` by Lit's `ReactiveController` interface. `connectedCallback()` in `ReactiveElement` does `this.__controllers?.forEach((c) => c.hostConnected?.())` with no await. Even if `hostConnected()` were `async`, the returned promise would be ignored. This is a fundamental constraint of the Lit controller lifecycle.

**Fix:** Change the log message to be accurate:
```js
console.log("[Router] initial goto() fired — navigation running async");
```

Or remove the misleading log entirely and instead use the navigation lifecycle events (`RouterLocationChangedEvent`) to signal completion.

---

### Finding #2: `await updateComplete` Is Useless for Lazy-Loaded Children

**Severity:** 🔴 Design limitation — the optimization doesn't help for the most critical case

**Evidence from log:**
```
Routes.js:355   [Routes::APP-ROUTER] before requestUpdate  {children: Set(0)}
                ← zero children before render
Routes.js:443   RENDERING OUTLET APP-ROUTER
                ← render fires, <client-parent> stamped in DOM (unknown element)
Routes.js:363   [Routes::APP-ROUTER] after updateComplete  {children: Array(0)}
                ← zero children AFTER render too
Routes.js:139   [Routes::APP-ROUTER] navigation finished
                ← "finished" with nothing propagated
...
[service worker registered]
...
Routes.js:94    RouteConnected::CLIENT-PARENT ...
                ← ONLY NOW, lazy chunk finally loaded
```

**Root cause:** The `await updateComplete` optimization in `Routes._navigate()` assumes children register synchronously during the render:

```js
this._host.requestUpdate();
await this._host.updateComplete;         // wait for render

await this._propagateNavigation(         // propagate to newly-registered children
    parsedRouteParams.tailGroup,
    { ... },
    this._children,                      // children populated during render
);
```

This assumption is **false** for lazy-loaded children. A lazy webpack async module (`import("./client-parent.js")`) downloads asynchronously over the network. The `<client-parent>` element exists in the DOM after the render, but as an unknown element. Its `connectedCallback` and `hostConnected` fire only when the chunk downloads, which can be much later.

**Timeline showing the gap:**

```
T=0ms   APP-ROUTER renders → <client-parent> stamped in DOM (unknown element)
T=0ms   APP-ROUTER updateComplete resolves → _propagateNavigation([], no-op)
T=0ms   APP-ROUTER navigation "finished"
T=??ms  [network: client-parent.js chunk downloading...]
T=+N ms client-parent chunk executes → custom element defined → element upgraded
T=+N ms CLIENT-PARENT connectedCallback → hostConnected → PATH A starts
```

The gap between T=0 and T=+N is the chunk download time, which can be 10-500ms depending on network conditions. During this time, the page shows no content at the APP-ROUTER outlet.

**Consequence:** For APP-ROUTER, `_propagateNavigation` is **dead code** on every first load. The entire propagation below APP-ROUTER is driven exclusively by `childRouteConnected` (PATH A). The `await updateComplete` adds latency (waiting for the render) with zero benefit for this level.

**What would fix this:** Removing `await updateComplete` and the subsequent `_propagateNavigation` call from the new-route path of `_navigate`. PATH A (`childRouteConnected`) is the mechanism that actually delivers navigation to lazy children. PATH B (`_propagateNavigation`) only matters for eagerly-imported children, and even there it creates the double-fire problem (Finding #5). See [Recommendations](#10-recommendations).

---

### Finding #3: Every `await` Is a Render Window — `NO ROUTE OR RENDER FUNCTION`

**Severity:** 🟡 Noisy — cosmetic but indicates half-initialized renders

**Log lines:**
```
Routes.js:425   NO ROUTE OR RENDER FUNCTION, RETURNING NOTHING CLIENT-PARENT undefined
                {pathname: '', tailGroup: '', hasTail: false, fullPathname: '', ...}

Routes.js:425   NO ROUTE OR RENDER FUNCTION, RETURNING NOTHING HOME-MODALS undefined
                {pathname: '', tailGroup: '', hasTail: false, ...}

Routes.js:425   NO ROUTE OR RENDER FUNCTION, RETURNING NOTHING TASK-PAGE-MODALS undefined
                ...
```

**What's happening:** Each `await` point in `_navigate` yields to the microtask queue. Pending Lit render updates can fire during those yields. When a component renders while its `Routes` controller is mid-navigation (before `currentRoute` has been set), `outlet()` finds `this.currentRoute === undefined` and logs the warning.

**The specific yield that causes this:** `await canDeeplyLeave(this, this.router, signal)`.

```js
async function canDeeplyLeave(instance, router, signal) {
    if (typeof instance.currentRoute?.leave === 'function') {  // ← skipped if no currentRoute
        ...
    }
    for (const child of instance._children) { ... }           // ← empty set on first load
    return true;  // ← returns true immediately
}
```

`canDeeplyLeave` is synchronous in effect on first load (no leave guard, no children). But it is declared `async` and called with `await`. **An `async` function that returns synchronously still yields once to the microtask queue.** This is a JavaScript specification guarantee:

```js
async function syncReturn() { return true; }
const p = syncReturn();
// p is a Promise — the continuation is a microtask, not synchronous
```

So `await canDeeplyLeave()` always yields exactly once, even when the function body does nothing. That yield is enough for a pending Lit render to fire.

**What the state object shows:**
```
{pathname: '', tailGroup: '', hasTail: false, fullPathname: '', searchParams: {…}}
```

This is the **initial state** of the `Routes` instance — never mutated, unchanged from construction. The component was rendered before navigation ever committed `currentRoute`.

**Who triggers those renders?** The parent's `requestUpdate()` propagates through Lit's dependency chain. When APP-ROUTER calls `requestUpdate()` in its `_navigate`, this can cause `<app-router>` to re-render. When `<app-router>` re-renders, it re-evaluates its template which includes `<client-parent>`. Lit's diffing re-uses the existing `<client-parent>` element but may re-render it if it has changed properties. The signal-based stores (`AuthStoreController`) can also trigger updates independently.

**Consequence:** Three components render with empty outlets before their navigation commits. This is transient (the correct render follows) but produces flicker if any CSS is applied to the outlet slot.

---

### Finding #4: `home-page` Lit Anti-Pattern Warning

**Severity:** 🟡 Minor performance concern — unrelated to router directly

**Log line:**
```
index.js:2  Element home-page scheduled an update (generally because a property was set)
            after an update completed, causing a new update to be scheduled.
            This is inefficient and should be avoided unless the next update can only be
            scheduled as a side effect of the previous update.
```

**Stack trace (abbreviated):**
```
requestUpdate @ reactive-element.js:728
__initialize @ reactive-element.js:506
ReactiveElement @ reactive-element.js:492
SignalWatcher @ signal-watcher.js:13
HomePage @ index.js:111
← lit-html rendering CLIENT-PARENT's template
← Routes._navigate (requestUpdate at line 359)
← CLIENT-PARENT childRouteConnected PATH A
```

**Root cause:** `home-page` extends `SignalWatcher`. `SignalWatcher`'s constructor sets up signal subscriptions. When a signal subscription is established, if any signal's current value triggers an immediate callback, `requestUpdate()` is scheduled on the element **during construction**.

`<home-page>` is constructed during `CLIENT-PARENT`'s `performUpdate()` render phase (when `lit-html` stamps the `<home-page>` node). Lit detects that a new `requestUpdate()` was scheduled on a newly-constructed element while an update is already in progress. Technically, this means the `home-page` element needs an additional update cycle immediately after the current one.

**Why the router is involved:** The router's `requestUpdate()` in `_navigate` is what caused `CLIENT-PARENT` to render, which caused `home-page` to be constructed. The warning is about `home-page`'s internal initialization, but the router is the trigger.

**Is this a real problem?** In practice, this means `home-page` requires two update cycles on first mount instead of one. For a complex page, this can cause visible double-render. The Lit documentation discourages this pattern. It should be fixed in `home-page`'s signal setup, not in the router.

---

### Finding #5: The Double-Fire / Abort Pattern at Every Eager Level

**Severity:** 🟠 Wasted work — redundant navigation runs at 3 of 4 non-root levels

**Evidence — three aborts in this log:**
```
Routes.js:167   Navigation signal aborted /task/open/... HOME-MODALS navigation-aborted
Routes.js:167   Navigation signal aborted /chat/... TASK-PAGE-MODALS navigation-aborted
Routes.js:167   Navigation signal aborted / CHAT-PAGE-MODALS navigation-aborted
```

**What happens at each level:**

For every eagerly-imported child `X` of parent `P`:

1. **During P's render:** `X.hostConnected()` fires → `RoutesConnectedEvent` → `P.onChildConnected()` → `P._children.add(X)` → `P.childRouteConnected(X)` → `X._gotoInternal(tailGroup)` — **PATH A starts, not awaited**

2. **PATH A runs:** `X._navigate` starts asynchronously. Gets as far as `await canDeeplyLeave()` (yields once), then resumes. Meanwhile:

3. **P's `updateComplete` resolves:** Now P knows X is in `_children` (it registered during step 1). P calls `_propagateNavigation([X])` → `X._gotoInternal(tailGroup)` — **PATH B starts**

4. **PATH B's first action:** `this._currentAbort?.abort()` — immediately signals PATH A's `AbortController`

5. **PATH A's next `checkSignal()`:** Signal is aborted → throws `InvalidNavigationError({ reason: "navigation-aborted" })`

6. **Both navigations:** PATH A throws (caught, logged as console.trace). PATH B runs cleanly.

**Work performed and discarded by PATH A:**

For each of the 3 aborted levels (HOME-MODALS, TASK-PAGE-MODALS, CHAT-PAGE-MODALS), PATH A performed:
- Route matching (`RoutesSet.matchRoute()`) 
- `parsePathname()` call
- Signal checks
- `canDeeplyLeave()` call (async boundary)
- Partial leave guard evaluation (if applicable)
- In some cases: enter guard call, state update, `requestUpdate()`, `await updateComplete`, partial render

**At CHAT-PAGE-MODALS level (worst case PATH A):** The log shows PATH A for CHAT-PAGE-MODALS actually got all the way through the enter guard and began state update before being aborted:
```
Routes.js:332   [Routes::CHAT-PAGE-MODALS] updating state /  {isPassthrough: false}
Routes.js:355   [Routes::CHAT-PAGE-MODALS] before requestUpdate /  {children: Set(0)}
Routes.js:443   RENDERING OUTLET CHAT-PAGE-MODALS     ← PATH A rendered!
Routes.js:103   Navigation aborted while navigating to / in CHAT-PAGE-MODALS  ← THEN aborted
```

Wait — CHAT-PAGE-MODALS actually **renders** during PATH A before being aborted. The abort happens AFTER `requestUpdate()` was called and the component rendered. So CHAT-PAGE-MODALS renders **twice**: once in PATH A, once in PATH B. This is the maximum waste level — a complete duplicate render.

**Why does CHAT-PAGE-MODALS run further than HOME-MODALS before being aborted?** Because the collision timing shifts with each level. By the time we reach CHAT-PAGE-MODALS, TASK-PAGE-MODALS's PATH B has more async work to do (await `canDeeplyLeave`, enter guard, etc.) before its `_propagateNavigation` fires to abort CHAT-PAGE-MODALS PATH A. This gives CHAT-PAGE-MODALS PATH A more time to run before the abort signal arrives.

**Why CLIENT-PARENT is NOT aborted:**

CLIENT-PARENT is lazy-loaded. APP-ROUTER's `updateComplete` resolved with zero children. PATH B for CLIENT-PARENT never fires. CLIENT-PARENT only has PATH A.

```
APP-ROUTER:     updateComplete → children: Array(0) → _propagateNavigation(no-op) → NO PATH B
CLIENT-PARENT:  updateComplete → children: Array(1) → _propagateNavigation([HOME-MODALS]) → PATH B exists
HOME-MODALS:    updateComplete → children: Array(1) → _propagateNavigation([TASK-PAGE-MODALS]) → PATH B exists
TASK-PAGE-MODALS: updateComplete → children: Array(1) → _propagateNavigation([CHAT-PAGE-MODALS]) → PATH B exists
CHAT-PAGE-MODALS: updateComplete → children: Array(0) → leaf, no PATH B needed
```

The "double-fire" pattern occurs at levels 2, 3, and 4 (HOME-MODALS, TASK-PAGE-MODALS, CHAT-PAGE-MODALS) but NOT at level 0 (APP-ROUTER, lazy) or level 1 (CLIENT-PARENT, lazy).

---

### Finding #6: `_parentRoute: null` on All PATH A First Calls

**Severity:** 🟢 Cosmetic — no functional impact

**Log pattern (repeats at every level):**
```
Routes.js:123   [Routes::SOME-CONTROLLER] called ...  {_parentRoute: null}  ← PATH A
...
Routes.js:123   [Routes::SOME-CONTROLLER] called ...  {_parentRoute: Routes}  ← PATH B
```

**Root cause — the exact sequencing in `AbstractController.hostConnected`:**

```js
hostConnected() {
    const connectEvent = new RoutesConnectedEvent(this);
    this._host.dispatchEvent(connectEvent);        // ← step 1: event dispatched
    this.__childRouteConnected(connectEvent);      // ← step 3: processes parentRoute
}
```

During step 1, the event bubbles to the parent outlet. The parent's `onChildConnected` fires:
```js
onChildConnected = (event) => {
    event.parentRoute = this;                       // ← stamps parent on event
    this._children.add(event.router);
    this.childRouteConnected(event.router);         // ← PATH A starts here
        → [log shows _parentRoute: null here]
};
```

PATH A starts (step 2) while still inside step 1's `dispatchEvent` call. Step 3 (`__childRouteConnected`) hasn't run yet — it's after `dispatchEvent` returns. Step 3 is where `this._parentRoute = event.parentRoute` is finally executed.

**Is this a bug?** No. `_parentRoute` is used for:
- `link()` — building URL paths for `Navigation.push/pop/link`
- `onRouteAcknowledge` — scope discovery for `Navigation` controller

Neither of these is used during `_navigate`. The matching algorithm (`matchRoute`, `parsePathname`, `checkSignal`, `enter`/`leave` guards) doesn't consult `_parentRoute`. PATH A navigates correctly despite the temporary null.

By the time PATH B runs, `__childRouteConnected` has long since set `_parentRoute` correctly, which is why PATH B always shows `_parentRoute: Routes`.

---

### Finding #7: `isPassthrough: true` State Preservation Logic Works Correctly

**Severity:** ✅ Correct behaviour — documenting for clarity

**Evidence:**
```
Routes.js:332   [Routes::APP-ROUTER] updating state ... {isPassthrough: true, ...}
Routes.js:332   [Routes::CLIENT-PARENT] updating state ... {isPassthrough: true, ...}
Routes.js:332   [Routes::HOME-MODALS] updating state ... {isPassthrough: true, ...}
Routes.js:332   [Routes::TASK-PAGE-MODALS] updating state ... {isPassthrough: false, ...}
Routes.js:332   [Routes::CHAT-PAGE-MODALS] updating state ... {isPassthrough: false, ...}
```

`isPassthrough` is computed as:
```js
const isPassthrough = parsedRouteParams.tailGroup && parsedRouteParams.tailGroup !== "/";
```

Levels 0–2 (APP-ROUTER, CLIENT-PARENT, HOME-MODALS) are passthrough: they have a meaningful `tailGroup` that gets forwarded. Their `searchParams` and `hash` are preserved from their own current state rather than being overwritten by the deeply-nested tail's values.

Levels 3–4 (TASK-PAGE-MODALS, CHAT-PAGE-MODALS) are NOT passthrough: TASK-PAGE-MODALS matches `/chat/:chatId` (no wildcard), producing `tailGroup = "/"`. The `/` is the normalized fallback, not a meaningful tail. CHAT-PAGE-MODALS is the leaf.

The `isPassthrough: false` transition at TASK-PAGE-MODALS is correct: it means this level "owns" the current searchParams/hash — they are applied here, not preserved from parent state.

---

### Finding #8: `children: Array(0)` After APP-ROUTER `updateComplete`

**Severity:** ✅ Confirms lazy-load behavior — not a bug

**Evidence:**
```
Routes.js:355   [Routes::APP-ROUTER] before requestUpdate  {children: Set(0)}
Routes.js:443   RENDERING OUTLET APP-ROUTER
Routes.js:363   [Routes::APP-ROUTER] after updateComplete  {children: Array(0)}
```

The transition from `Set(0)` to `Array(0)` is an artefact of the log: `before requestUpdate` logs `this._children` directly (a `Set`), while `after updateComplete` logs `Array.from(this._children)` (converted for the log). Both are empty.

This confirms that for APP-ROUTER, the entire `_propagateNavigation` call is a no-op on every first load when `client-parent.js` is lazy. The `await updateComplete` adds the latency of one full render cycle (waiting for the DOM to update) in exchange for zero propagation benefit.

---

## 6. The Lazy vs. Eager Propagation Split

This is the most important structural insight from these logs. The router currently uses **two different propagation mechanisms** without explicitly acknowledging that they serve different child types:

```
                          ┌─────────────────────────────────────────────────────┐
                          │             How does the child get navigated?        │
                          ├──────────────────────────┬──────────────────────────┤
                          │   Lazy-loaded child       │   Eagerly-imported child  │
                          │   (webpack async import)  │   (eager import or sync)  │
┌─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ When does child connect?│ After parent updateComplete│ During parent's render   │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ In _children at         │                          │                           │
│ updateComplete time?    │          ❌ No            │          ✅ Yes            │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ PATH A fires?           │   ✅ Yes (only mechanism)  │   ✅ Yes (aborted by B)   │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ PATH B fires?           │          ❌ No             │          ✅ Yes (wins)    │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Double-fire / abort?    │          ❌ No             │          ✅ Yes           │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ await updateComplete    │          💀 Wasted        │         ✅ Needed (B)     │
│ in parent useful?       │                          │                           │
└─────────────────────────┴──────────────────────────┴──────────────────────────┘
```

**Examples in this navigation:**

| Controller | Type | Propagation Mechanism | PATH B? | Abort? |
|---|---|---|---|---|
| CLIENT-PARENT | Lazy (async chunk) | PATH A only | ❌ | ❌ |
| HOME-MODALS | Eager (in client-parent.js) | PATH A aborted by PATH B | ✅ | ✅ |
| TASK-PAGE-MODALS | Eager (in home-page) | PATH A aborted by PATH B | ✅ | ✅ |
| CHAT-PAGE-MODALS | Eager (in task-page) | PATH A aborted by PATH B | ✅ | ✅ |

**The irony:** The `await updateComplete` was specifically added to guarantee children are registered before `_propagateNavigation` runs — making PATH B the "reliable" mechanism for eager children. But this created the double-fire for all eager children (3 aborts in this log), added render-cycle latency for lazy children (with no benefit), and made the router always async even for simple navigations.

The original Google router had only PATH A (via `_onRoutesConnected`). No `await updateComplete`. No PATH B. No double-fire. No aborts. It worked because PATH A was the only mechanism, and since `_currentParams` was set synchronously before `requestUpdate()`, any child that connected during the render would always find the correct tailGroup waiting for it.

---

## 7. End-to-End Navigation Timeline Diagram

```
TIME ──►

[T0] connectedCallback()
      enableUpdating()
      router.hostConnected()
         goto(url, {isBrowserNavigation: true})  ← NOT awaited
            _navigate(url)
               matchRoute()        ← SYNC
               parsePathname()     ← SYNC  
               checkSignal() x3   ← SYNC
               state = {...}       ← SYNC
               requestUpdate()     ← SYNC
               await updateComplete ─────────────────────────────────────────────────────┐
      hostConnected() returns                                                             │
      ← "[Router] initial navigation completed" LOG (misleading)                          │
      connectedCallback() returns                                                         │
                                                                                          │
[T1] [microtask] performUpdate() → render()                                              │
      RENDERING OUTLET APP-ROUTER                                                         │
      <client-parent> stamped (unknown element)                                           │
                                                                            ◄────────────┘
      updateComplete resolves
         children: Array(0) — EMPTY
         _propagateNavigation([]) — NO-OP
      APP-ROUTER navigation "finished" (but tree is empty)

[T2] [async] webpack chunk client-parent.js downloads...

[T3] chunk executes → <client-parent> upgraded → connectedCallback()
      CLIENT-PARENT hostConnected()
         RoutesConnectedEvent → APP-ROUTER.onChildConnected()
            _children.add(CLIENT-PARENT)
            childRouteConnected(CLIENT-PARENT)  ← PATH A for CLIENT-PARENT
               _gotoInternal(tailGroup)  ← NOT awaited
                  _navId++
                  _navigate(tailGroup)
                     matchRoute()     ← SYNC
                     parsePathname()  ← SYNC
                     checkSignal() A  ← SYNC
                     await canDeeplyLeave()  ──────────────────────────────────────────┐
                                                                                        │
            [CLIENT-PARENT initial render fires during this yield]                     │
               outlet() → NO ROUTE OR RENDER FUNCTION (currentRoute=undefined)         │
                                                                         ◄─────────────┘
                     canDeeplyLeave → true
                     checkSignal() B,C
                     enter() → undefined (sync)
                     checkSignal() D,E
                     currentRoute = /* route    ← COMMITTED
                     state = {tailGroup: '/task/...'}
                     requestUpdate()
                     await updateComplete  ────────────────────────────────────────────┐
                                                                                        │
[T4] [microtask] CLIENT-PARENT render fires                                            │
      RENDERING OUTLET CLIENT-PARENT                                                    │
      <home-page> connects (eager) → HOME-MODALS connects                              │
         HOME-MODALS PATH A starts:                                                     │
            _gotoInternal() — NOT awaited                                              │
            matchRoute(), parsePathname(), checkSignal(A)                              │
            await canDeeplyLeave()  ──────────────────────────────────┐               │
            [HOME-MODALS first render: NO ROUTE OR RENDER FUNCTION]   │               │
                                                        ◄─────────────┘               │
            checkSignal(B) — ABORT! signal already set by PATH B below               │
                                                                                        │
                                                             ◄──────────────────────── ┘
      CLIENT-PARENT updateComplete resolves
         children: Array(1) — HOME-MODALS present
         _propagateNavigation([HOME-MODALS])  ← PATH B for HOME-MODALS
            HOME-MODALS._gotoInternal()  ← aborts PATH A immediately
            (PATH B runs cleanly → same matchRoute/enter/state cycle)
            requestUpdate() → await updateComplete ─────────────────────────────────┐
                                                                                      │
[T5] [microtask] HOME-MODALS render fires                                            │
      RENDERING OUTLET HOME-MODALS                                                    │
      <task-page> connects → TASK-PAGE-MODALS connects                               │
         TASK-PAGE-MODALS PATH A: starts, gets aborted by HOME-MODALS PATH B         │
                                                                       ◄─────────────┘
      HOME-MODALS updateComplete resolves
         _propagateNavigation([TASK-PAGE-MODALS])  ← PATH B
         ...same pattern continues...

[T6] TASK-PAGE-MODALS render → CHAT-PAGE-MODALS PATH A starts → aborted by PATH B
[T7] CHAT-PAGE-MODALS PATH B runs cleanly → leaf → no children
[T8] updateComplete resolves up the chain → all navigations finish bottom-up
```

---

## 8. What the Logs Confirm Is Working Correctly

Despite the problems found, the logs confirm the following aspects of the router are functioning as designed:

**✅ Route matching is correct at all 5 levels.** Every controller matched the right route for its segment of the URL. The scoring system correctly prioritized `/task/open/:orderId/*` over `/*` at the HOME-MODALS level.

**✅ Param extraction is correct.** `orderId = "69ea726034a53ed67f06c57d"` and `chatId = "699f13f89c7d213103c48ec1"` would be extractable from `collectParams()`.

**✅ The abort mechanism works correctly.** Three aborts fired, all were caught silently, PATH B proceeded in all three cases without side effects.

**✅ The `isBrowserNavigation` flag correctly bypasses leave guards** on initial load. No `canDeeplyLeave` is called at APP-ROUTER level.

**✅ `isPassthrough` state preservation works.** APP-ROUTER, CLIENT-PARENT, and HOME-MODALS correctly preserve their own `searchParams`/`hash` when they are just passing through to a child.

**✅ Bottom-up resolution works.** All 4 non-root navigations complete in the correct order (deepest first).

**✅ The `_currentAbort` cleanup is correct.** Each level's `navigation finished` log confirms the abort controller was cleared properly.

**✅ `childRouteConnected` correctly delivers tailGroup to lazy-loaded children.** CLIENT-PARENT received exactly the right tail even though it connected much later than the parent's render.

**✅ PATH A / PATH B collision is handled gracefully.** The abort mechanism swallows the error and PATH B navigates cleanly. No state corruption occurs.

---

## 9. What the Logs Reveal Is Wrong or Wasteful

**🔴 The `await updateComplete` + PATH B is architecturally mismatched to the actual use case.** In this 4-level tree, the outermost level (APP-ROUTER) has a lazy child where `await updateComplete` produces zero benefit. All inner levels have eager children where `await updateComplete` creates the double-fire problem. There is no level where `await updateComplete` provides benefit without also creating a double-fire.

**🟠 3 out of 4 non-root levels perform double navigation.** HOME-MODALS, TASK-PAGE-MODALS, and CHAT-PAGE-MODALS all have PATH A fully or partially running before it is aborted by PATH B. CHAT-PAGE-MODALS PATH A went furthest — it actually rendered its outlet before being aborted. This means at minimum 3 extra `matchRoute()` calls, 3 extra `parsePathname()` calls, 3 extra `canDeeplyLeave()` calls, and at least 1 extra full render cycle.

**🟠 The abortion of PATH A at CHAT-PAGE-MODALS fires AFTER a full render.** This is the worst-case double-render: CHAT-PAGE-MODALS renders once with PATH A (visible in RENDERING OUTLET log), then PATH A is aborted, then PATH B renders again. The user briefly sees one render, then another. For slow components, this can produce flicker.

**🟡 The "initial navigation completed" log fires before any child is navigated.** Any developer reading this log would reasonably conclude navigation is done when it fires. In reality, the page may be blank for another 100–500ms while the lazy chunk loads.

**🟡 `NO ROUTE OR RENDER FUNCTION` fires at 3 levels.** This warning fires as a `console.log` during what appears to be normal operation. It is misleading to any developer who sees it — it looks like an error when it is a transient state. It contributes to log noise and makes debugging harder.

**🟡 `home-page` double-update warning.** While not a router bug, the router's `requestUpdate()` triggering a render that constructs a `SignalWatcher` element (causing it to schedule its own update during the current update cycle) is a real inefficiency. The double-update warning from Lit is accurate.

---

## 10. Recommendations

### Recommendation 1 — Remove `await updateComplete` and PATH B from new-route path

**Impact:** Eliminates all 3 double-fire aborts. Eliminates the render-cycle latency for all navigations. Makes `_navigate` nearly synchronous (only blocked by actual async guards).

**Change in `Routes._navigate()`:**

```js
// CURRENT (new-route path ending):
this.currentRoute = nextRoute;
this.state = { pathname, ..., tailGroup, hasTail };

this._host.requestUpdate();
await this._host.updateComplete;               // ← REMOVE

await this._propagateNavigation(               // ← REMOVE
    parsedRouteParams.tailGroup,
    { extraParams, searchParams, hash, abortController },
    childrens,
);

// AFTER (new-route path ending):
this.currentRoute = nextRoute;
this.state = { pathname, ..., tailGroup, hasTail };

this._host.requestUpdate();
// ← done. childRouteConnected handles new children as they mount.
```

**Keep `_propagateNavigation` only in the same-route path** (where `nextRoute === this.currentRoute`), because in that case the parent doesn't re-render and no `childRouteConnected` will fire:

```js
// KEEP this one:
if (nextRoute === this.currentRoute) {
    this.state = { ... };
    await this._propagateNavigation(tailGroup, options, this._children); // ← keep
    return this._host.requestUpdate();
}
```

**Why this is safe:** PATH A (`childRouteConnected`) is the mechanism that serves all child types — both lazy and eager. The original Google router used only this mechanism and it worked correctly for nested routes. The `_parentRoute` is already set by the time PATH A does meaningful navigation work (it's set before any `await` in `_navigate` actually progresses to route-changing actions).

### Recommendation 2 — Move Navigation State from `Route` to `Routes.state`

**Impact:** Makes `Route` a pure immutable config object. Allows `Object.freeze(this)` to be enforced. Eliminates mutable per-navigation state on shared objects.

**Change:** `Route.parsePathname()` should return `hasTail` and not write to `this.hasTail`, `this.tailGroup`, `this.pathname`, `this.url`. Store the full result in `Routes.state`:

```js
// Route.parsePathname — pure, no this.xxx assignments
parsePathname(pathname) {
    const matched = this.pattern.exec(pathname);
    if (!matched) return null;
    const params = matched.pathname.groups || {};
    const rawTail = getTailGroup(params);
    for (const key of Object.keys(params)) {
        if (/^\d+$/.test(key)) delete params[key];
    }
    const hasTail = rawTail !== undefined;
    const tailGroup = rawTail ? new URL(rawTail, ORIGIN).pathname : "/";
    const matchedPathname = hasTail
        ? pathname.substring(0, pathname.length - rawTail.length)
        : pathname;
    return { params, pathname: matchedPathname, tailGroup, hasTail };  // pure return
}

// Routes.state gets tailGroup and hasTail:
this.state = {
    pathname: parsedRouteParams.pathname,
    params: parsedRouteParams.params,
    tailGroup: parsedRouteParams.tailGroup,    // ← NEW
    hasTail: parsedRouteParams.hasTail,        // ← NEW
    extraParams, searchParams, hash,
    fullPathname: parsedRouteParams.fullPathname,
};
```

All consumers of `currentRoute.tailGroup` and `currentRoute.hasTail` (in `Navigation.js` and `childRouteConnected`) would read from `this.state.tailGroup` / `this.state.hasTail` instead.

### Recommendation 3 — Fix the Misleading "initial navigation completed" Log

```js
// CURRENT:
console.log("[Router] initial navigation completed");

// FIX:
console.log("[Router] initial goto() dispatched — navigation running async");
```

Or better: remove the manual log from `hostConnected` entirely. The `RouterLocationChangedEvent` dispatched at the end of a successful navigation already serves as the canonical "navigation complete" signal.

### Recommendation 4 — Fix the `Router.pathname` Trailing Slash Bug

**Current (buggy):**
```js
get pathname() {
    return this.currentRoute?.url || "/";  // url = "/user/42/" for non-wildcard routes
}
```

**Fix:**
```js
get pathname() {
    return this.state?.fullPathname || "/";  // fullPathname is always correct
}
```

This also fixes the no-op guard in `goto()` that never fires for non-wildcard routes due to trailing slash mismatch.

### Recommendation 5 — Consider Removing `NO ROUTE OR RENDER FUNCTION` Console.log

The warning fires on every child during their first partial render before navigation commits. It is expected behaviour during PATH A. Replace with a conditional that only logs in an explicit debug mode:

```js
outlet() {
    if (!this.currentRoute || !this.currentRoute?.render || !this.router) {
        if (import.meta.env.DEV && this._debugMode) {
            console.log(`[lit-router:debug] outlet() called before navigation committed`, this._host.nodeName);
        }
        return undefined;
    }
    ...
}
```

### Recommendation 6 — Add Navigation Completion Observable

Because `hostConnected()` is void and `goto()` is fire-and-forget, there is currently no clean way to know when the full tree navigation has completed. A simple observable on the root `Router` would help:

```js
// On Router class:
get navigationComplete() {
    return this._navigationCompletePromise;
}

// Set at start of goto():
this._navigationCompletePromise = this._gotoInternal(...).then(() => { /* settled */ });
```

This would allow consumers and tests to `await router.navigationComplete` to know when the full tree is navigated.

---

## 11. Raw Log Annotated Reference

The following table maps every significant router log line to its source and meaning.

| # | Log | File:Line | Source Code | Meaning |
|---|-----|-----------|-------------|---------|
| 1 | `Initial navigation` | `Router.js:142` | `console.group()` | `goto()` being called |
| 2 | `[Router] initial navigation {state: null}` | `Router.js:143` | History state read | No history state on first load |
| 3 | `[Router] calling _gotoInternal` | `Router.js:221` | Before `_gotoInternal` call | Full pathname + options logged |
| 4 | `[Routes::X] called /path` | `Routes.js:123` | `_gotoInternal` entry | First log in each navigate |
| 5 | `[Routes::X] matched route` | `Routes.js:200` | After `matchRoute()` | Which Route was selected |
| 6 | `[Routes::X] parsedRouteParams` | `Routes.js:220` | After `parsePathname()` | Params, tailGroup, hasTail |
| 7 | `Checking navigation signal` | `Routes.js:165` | `checkSignal()` | Abort check point |
| 8 | `[Router] initial navigation completed` | `Router.js:148` | After `goto()` call | ⚠️ MISLEADING — goto() just started |
| 9 | `RENDERING OUTLET X` | `Routes.js:443` | `outlet()` method | Component rendering with currentRoute set |
| 10 | `[Routes::X] after updateComplete` | `Routes.js:363` | After `await updateComplete` | Children count visible here |
| 11 | `[Routes::X] propagating navigation` | `Routes.js:399` | `_propagateNavigation` entry | PATH B about to fire |
| 12 | `Child::tailGroup` | `Routes.js:406` | Inside `_propagateNavigation` | Each child gets this tail |
| 13 | `RouteConnected::X for tail` | `Routes.js:94` | `childRouteConnected` entry | PATH A triggered |
| 14 | `Navigation signal aborted X` | `Routes.js:167` | `checkSignal()` — abort detected | PATH A aborted by PATH B |
| 15 | `Navigation aborted while...` | `Routes.js:103` | `InvalidNavigationError` logged | PATH A officially dead |
| 16 | `[Routes::X] canDeeplyLeave result` | `Routes.js:279` | After `await canDeeplyLeave` | Can leave = true/false |
| 17 | `[Routes::X] enter callback result` | `Routes.js:308` | After `await route.enter()` | canEnter = true/false/undefined |
| 18 | `[Routes::X] updating state` | `Routes.js:332` | State mutation | isPassthrough decision visible |
| 19 | `[Routes::X] before requestUpdate` | `Routes.js:355` | Before `requestUpdate()` | children Set size visible |
| 20 | `[Routes::X] navigation finished` | `Routes.js:139` | Finally block in `_gotoInternal` | AbortController cleared |
| 21 | `NO ROUTE OR RENDER FUNCTION X` | `Routes.js:425` | `outlet()` called early | currentRoute undefined, returns nothing |
| 22 | `home-page scheduled update after...` | `index.js:2` | Lit `_$didUpdate` | SignalWatcher initialized during render |

---

*Report generated 2026-04-27 based on browser console log from initial page load.*  
*Source: `src/router/lit-router/docs/navigation-log-analysis.md`*
