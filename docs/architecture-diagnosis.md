# Lit Router Architecture Diagnosis

## Scope and sources
- Code reviewed: `src/router/lit-router/**` (excluding `docs`)
- Tests reviewed: `tests/router/**` and `tests/test-utils/**`
- Usage reference: `src/router/lit-router/README.md`

## Executive summary
- Routing correctness largely works for happy paths, but navigation relies on broad event side effects that complicate lifecycle predictability.
- Child-route propagation depends on explicit wildcards and uses inconsistent tail normalization, which can cause ambiguous propagation and makes nested trees brittle.
- Navigation events and update signals are inconsistent and overly broad, leading to unnecessary renders and weak integration contracts.
- The `Navigation` controller mixes context discovery, state memory, and UI updates, which increases coupling and makes partial usage fragile.
- Route table caching and parameter aggregation can become stale or polluted in real apps that mutate routes or mount multiple children.

## Design constraints (non-issues)
- The root router is intentionally exposed via `globalThis.__lit_router_main` and this is not considered a weakness. The architecture avoids context-based injection by design.
- Parent/child discovery relies on event bubbling (not context). This is intentional so each child registers with its immediate parent in the root -> son -> grandson hierarchy.

## Event-bubbling discovery workflow (Routes + Navigation)
**Current workflow**
- Routes connect upward: each `RoutesController` dispatches `lit-routes-connected` and the nearest parent outlet registers the child.
- Navigation discovers scope upward: `Navigation` dispatches `lit-routes-acknowledge` and the nearest outlet stamps `event.current` and `event.parent`.
- A visual diagram lives at `src/router/lit-router/docs/event-bubbling-workflow.mmd`.

**Why it exists**
- Avoids context APIs and ensures immediate-parent registration in deep trees.
- Works across portals because the outlet wrapper captures events at the render boundary.

**Risks if not hardened**
- Missing outlet wrapper or out-of-order connections can produce silent fallbacks to the root router.
- Duplicate registration or stale child entries can occur when components are rapidly re-mounted.

**Proposed robustness improvements (must preserve portal support)**
- Keep the bubbling contract and the outlet boundary; do not replace with context or direct DOM traversal.
- Add explicit warnings when `Navigation` falls back to the root (no acknowledgement received).
- Include a `routerId`/`instanceId` on events to prevent cross-tree collisions in complex apps.
- Debounce or coalesce repeated connect/disconnect signals to avoid duplicate child registration.
- Add a connection handshake timeout (e.g., warn if no parent acknowledges within a tick).
- Provide a small debug utility to trace event paths via `composedPath()` and show which outlet consumed the event.

## Navigation controller diagnosis
**Issue**
- The controller combines three concerns: event-based context discovery (`current`/`parent`), navigation commands (`goto`/`push`/`pop`), and UI invalidation via `requestUpdate()`.
- `routeName` and several operations assume `current` and `_currentRoute` are always defined, which can throw during initial connect or when no route is matched.
- `url()` reads state from the root router only, which can be misleading when called from nested components.

**Evidence**
- `src/router/lit-router/Navigation.js`:
  - `hostConnected()` uses `RoutesAcknowledgeEvent` to set `current`/`parent`.
  - `_handleRouterChanged()` updates all hosts on window events.
  - `routeName` accesses `this.current._currentRoute.name` without guards.
  - `url()` relies on `this.router._currentRoute` and its tail group.

**Impact**
- The controller is harder to test in isolation and harder to evolve because discovery, commands, and updates are tightly coupled.
- Unnecessary updates across components that are not affected by the active navigation.
- Potential runtime errors when navigation state is not fully initialized.

**Proposed solution**
- Keep event-based discovery but reduce coupling: keep `Navigation` as a thin command proxy and move state memory/updates into the router lifecycle.
- Add safe guards for `current`/`_currentRoute` in accessors and operations.
- Align `url()` with `current.link()` or provide a clearly named root-only URL helper.
- Scope update signals to relevant hosts (or allow opt-in subscription).

## Child navigation propagation workflow (dedicated)
**Issue**
- Child propagation only happens when the parent route ends with a wildcard (`*`).
- Tail normalization is inconsistent between connection and propagation paths.
- All registered child routers receive propagation regardless of whether they are active.

**Evidence**
- `src/router/lit-router/RoutesController.js`:
  - `_propagateNavigation` only runs if `this._currentRoute.path.endsWith("*")`.
  - `_connectChild` uses `getTailGroup(...)` without normalization, while `_onRoutesConnected` uses `pathjoin("/", ...)`.
  - `_childRoutes` stores all connected children without an active-chain filter.
- `tests/router/hierarchical-navigation.test.js` shows propagation depends on wildcard segments.

**Impact**
- Nested routing is fragile and coupled to explicit wildcard declaration on every parent.
- Multiple child routers can be unintentionally updated, which can pollute params and trigger unnecessary renders.
- Tail mismatches can create subtle path bugs when mixing absolute and relative tail groups.

**Proposed solution**
- Normalize tail groups in one place (single function) and always propagate a consistent format.
- Track the active child chain (or active outlet) and only propagate to the relevant branch.
- Prepare for implicit child propagation (see roadmap) so parents do not require explicit wildcards.

## Navigation lifecycle and event model inconsistencies
**Issue**
- Event payloads are inconsistent between direct navigation and popstate navigation.
- Event dispatch targets vary (window vs host), making listeners brittle.
- There is no formal navigation lifecycle contract for middleware or cancellation.

**Evidence**
- `src/router/lit-router/Router.js`:
  - `goto()` dispatches `lit-router-navigation-start` with `goToPath` on `window`.
  - `_onPopState()` dispatches `lit-router-navigation-start` with `gotoPath` on the host.
- `src/router/lit-router/util/observeUrl.js` expects `event.detail.goToPath`.

**Impact**
- Observers can break depending on whether navigation originated from history or a programmatic call.
- Popstate navigation may not trigger expected listeners when they are attached at `window`.
- It is difficult to build global middlewares or telemetry.

**Proposed solution**
- Unify event payloads and always dispatch navigation events at `window` level with a consistent schema.
- Introduce a formal navigation lifecycle (start, commit, cancel, error) with a single context object.

## Update lifecycle and render efficiency
**Issue**
- Multiple `requestUpdate()` calls are triggered per navigation, and all components with a `Navigation` controller update on every window-level event.

**Evidence**
- `src/router/lit-router/RoutesController.js` calls `requestUpdate()` in `_navigate()` and again in `_propagateNavigation()`.
- `src/router/lit-router/Router.js` calls `requestUpdate()` in `replaceState()`.
- `src/router/lit-router/Navigation.js` listens on `window` and calls `host.requestUpdate()` for all instances.
- `tests/router/lifecycle-events.test.js` confirms window-level updates are intentionally broad.

**Impact**
- Redundant renders and extra update pressure in large trees.
- Hard to reason about minimum update surface when only query/hash changes.

**Proposed solution**
- Centralize update scheduling with a navigation state store.
- De-duplicate updates per navigation id and only re-render active route hosts.
- Allow opt-in granular updates for components that read navigation state directly.

## Route table mutation and caching
**Issue**
- The route sorting cache can become stale when `routes` is mutated in place.

**Evidence**
- `src/router/lit-router/RoutesController.js` caches sorted routes by comparing `routesSnapshot === this.routes`.
- Documentation encourages mutating the `routes` array directly.

**Impact**
- Newly added routes may not be considered in matching, causing confusing behavior.

**Proposed solution**
- Version the route table or wrap it behind a setter that clears caches.
- Deprecate direct mutation and push users toward `setRoutes()` / `addRoute()`.

## Parameter aggregation and context integrity
**Issue**
- Parameter aggregation merges params across all connected child routers, not just the active branch.
- Shallow cloning can leak mutation from `extraParams` and `searchParams`.

**Evidence**
- `src/router/lit-router/util/collectParams.js` traverses all `_childRoutes` indiscriminately.
- `src/router/lit-router/util/prepareParams.js` performs shallow copies only.

**Impact**
- Param pollution when multiple child routes are mounted (e.g., multiple outlets).
- Mutations of nested objects can bleed across routes.

**Proposed solution**
- Collect params only along the active branch, or tag active child nodes.
- Use immutable data patterns or deep clone where needed.

## External navigation interception
**Issue**
- Anchor clicks are intercepted without same-origin checks.

**Evidence**
- `src/router/lit-router/Router.js` `_onAnchorClick` only checks download/target/router-ignore.

**Impact**
- External links in the same tab are treated as internal routes, leading to incorrect navigation or errors.

**Proposed solution**
- Validate `anchor.origin === location.origin` and ignore external links by default.
- Provide a formal opt-out attribute or `router-external` handling.

## API drift, dead code, and correctness issues
**Issue**
- Several API inconsistencies and dead code paths indicate architectural drift.

**Evidence**
- `src/router/lit-router/RoutesController.js` closes `</-router-outlet>` (typo) in `outlet()`.
- `_onOutletConnected()` uses `this.outlets` but the field is `_outlets`.
- `OutletManager` and `Router._safeNavigate()` are unused.
- Tests use `exact: true`, but the router ignores it and README warns against it.

**Impact**
- Hidden bugs surface only in specific render trees or tooling scenarios.
- Confusing developer experience and inconsistent expectations.

**Proposed solution**
- Fix markup and property naming, remove dead code, and add validation warnings for unsupported route config.
- Align README and tests on supported configuration.

## URL parsing limitations
**Issue**
- Custom parsing does not round-trip arrays or duplicate query keys.

**Evidence**
- `src/router/lit-router/util/url.js` flattens search params into a plain object.

**Impact**
- Lossy query behavior for repeated keys (`?tag=a&tag=b`).

**Proposed solution**
- Rely on `URL` and `URLSearchParams` for parsing/serialization or document the limitation explicitly.
