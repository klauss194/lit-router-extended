# Lit Router Roadmap

## Goals
- Improve navigation determinism and update efficiency.
- Reduce dependence on explicit wildcard routing while preserving event-based discovery.
- Establish a consistent, extensible navigation lifecycle (to support middlewares).
- Preserve and harden portal support at every step.

## Roadmap (ordered by dependency)

### 1) Navigation lifecycle contract (foundation)
**Why first**
- All subsequent features (middlewares, smarter updates, child propagation) need a stable lifecycle and context model.

**Scope**
- Define a canonical navigation context structure (path, fullPath, params, searchParams, hash, extraParams, source, navigationId).
- Standardize events (`start`, `commit`, `cancel`, `error`) and dispatch targets (window-level).
- Ensure `popstate` and `goto` flows use the same payload fields.
- Keep event bubbling for discovery intact so portals remain first-class.

**Deliverables**
- A single source of truth for navigation context.
- Consistent event schema for all navigation paths.
- Portal-safe event flow (no reliance on context or DOM traversal).

### 2) Event-based discovery hardening + optional explicit wiring
**Dependency**
- Builds on the lifecycle contract (shared event schema, stable instance IDs).

**Goals**
- Keep event bubbling as the default (portal-safe) mechanism.
- Add guardrails and diagnostics to prevent silent fallbacks.
- Provide an optional explicit wiring API for advanced use cases without using context.

**Proposed API**
- Add `scopeId` and `instanceId` to `RoutesController` (and `Router`) instances.
- Add a `mode` option to `Navigation` for explicit wiring, defaulting to event discovery.

```js
// RoutesController (and Router) constructor option
new RoutesController(host, routes, { scopeId: "app", instanceId: "parent-1" });

// Navigation optional explicit mode
new Navigation(host, {
  mode: "explicit",
  current: this._routes,
  parent: parentRoutes,
  root: globalThis.__lit_router_main,
});

// Default event-based discovery (unchanged)
new Navigation(host);
```

**Event schema improvements (backward compatible)**
- `lit-routes-connected` and `lit-routes-acknowledge` should carry:
  - `scopeId`, `instanceId`, `parentInstanceId`
  - `timestamp` and `navigationId` (if available)
- Parent should only acknowledge children when:
  - `scopeId` matches, or
  - `scopeId` is undefined (legacy mode)

**Robustness improvements**
- Add a handshake timeout warning when `Navigation` receives no acknowledgement.
- Debounce connect/disconnect to avoid duplicate child registration during rapid remounts.
- Provide a debug helper that logs `composedPath()` and the outlet that consumed the event.

**Conceptual implementation sketch**
```js
// In RoutesController.hostConnected()
const event = new RoutesConnectedEvent(this);
event.scopeId = this.scopeId;
event.instanceId = this.instanceId;
this._host.dispatchEvent(event);

// In lit-router-outlet
if (this.instance.scopeId && e.scopeId && e.scopeId !== this.instance.scopeId) return;
e.parent = this.instance._parentRouter;
e.current = this.instance;
```

**Deliverables**
- Event discovery remains portal-safe and more deterministic.
- Optional explicit wiring is supported for advanced compositions.

**Migration strategy (project-wide, JS-only)**
- Phase 1 (non-breaking):
  - Add `scopeId`/`instanceId` fields and include them in events.
  - Keep event-based discovery as the default (no code changes required for users).
  - Add warnings only (no runtime errors) when acknowledgements fail.
- Phase 2 (opt-in):
  - Document the explicit wiring mode for teams that want deterministic trees.
  - Provide JS examples (no TypeScript typings required).
- Phase 3 (hardening):
  - Enable stricter checks when `scopeId` is set (ignore mismatched scopes).
  - Add a migration guide for apps using multiple routers or portals.

### 3) Update scheduling and minimal renders
**Dependency**
- Requires the lifecycle context from step 1.

**Scope**
- De-duplicate `requestUpdate()` across route, outlet, and navigation controllers.
- Only update active route hosts (avoid global invalidation by default).
- Add an opt-in subscription for components that want global navigation updates.
- Preserve portal awareness by scheduling updates via the event graph, not via DOM traversal.

**Deliverables**
- A centralized update scheduler keyed by navigationId.
- Clear rules for what triggers re-render.
- No regression in portal-based rendering.

### 4) Automatic child propagation (implicit wildcard)
**Dependency**
- Requires lifecycle context and active-branch tracking.

**Objective**
- When a child router connects, the parent should detect it and propagate navigation without requiring an explicit wildcard in the parent route.

**Proposed approach**
- Introduce a "child-aware" mode in `RoutesController`:
  - When a child connects, parent registers a propagation capability.
  - Parent treats its current route as if it had an implicit tail (e.g., internally add a wildcard to the route pattern, or compute a synthetic tail from the current pathname).
  - Propagate only to the active child branch.
- Ensure discovery stays event-based so portals continue to work without special casing.
- Make the implicit wildcard behavior configurable or a new router version flag.

**Deliverables**
- Child routers receive navigation tail even when parent route does not declare `*`.
- Tail normalization is consistent across connect/propagation.
- Portal compatibility tests added for nested and portaled routes.

### 5) Global middleware pipeline
**Dependency**
- Requires lifecycle contract from step 1 and update scheduler from step 2.

**Scope**
- Add middleware hooks (`before`, `after`, `cancel`, `error`).
- Allow middleware to mutate or block navigation context.
- Provide ordering and async handling (serial pipeline).
- Ensure middleware runs regardless of portal usage (event-based propagation remains).

**Deliverables**
- Middleware registration API.
- Standardized error/cancel flow.
- No portal regression in navigation events.

### 6) Route table integrity and cache invalidation
**Dependency**
- Independent, but easier once navigation lifecycle is standardized.

**Scope**
- Replace direct array mutation with versioned route table.
- Ensure pattern and sorting caches are invalidated on mutations.

**Deliverables**
- Stable route cache behavior and clearer dynamic route API.
- Ensure dynamic routes added after portal mounts still propagate correctly.

### 7) Parameter isolation and active-branch context
**Dependency**
- Builds on active-branch logic from step 3.

**Scope**
- Aggregate params only from the active branch.
- Avoid cross-contamination between parallel child routers.
- Maintain branch selection via event lineage (portal safe).

**Deliverables**
- Deterministic param contexts with no leakage.
- Portal-based trees pass the same param propagation tests as in-DOM trees.

### 8) External link handling and URL parsing upgrades
**Dependency**
- Independent.

**Scope**
- Same-origin checks for anchor interception.
- Optional `URLSearchParams` preservation for multi-value keys.

**Deliverables**
- Safer anchor navigation and more faithful query serialization.
- No impact to portal event routing.

## Notes
- The implicit wildcard feature (step 4) is intentionally placed after lifecycle + update foundations. It relies on correct context propagation and active-branch identification to avoid ambiguous updates.
- Each step should include tests that mirror `tests/router/hierarchical-navigation.test.js` scenarios to prevent regression.
- Add portal-specific tests (portaled outlet + nested child) to each step as a non-regression gate.
