# Lit Router Migration Guide

This guide covers the project-wide migration path for the upcoming discovery hardening and optional explicit wiring mode. The codebase remains vanilla JavaScript.

## Phase 1 (non-breaking): event enrichment and warnings
No user code changes required. The router emits additional metadata (`scopeId`, `instanceId`) and logs warnings when discovery fails.

## Phase 2 (opt-in): explicit wiring mode
Teams that need deterministic wiring can opt in without changing the default event-based behavior.

### Example: explicit wiring for a nested component

**Before** (event-based discovery)
```js
import { LitElement } from "lit";
import { Routes, Navigation } from "lit-router";

class ChildView extends LitElement {
  constructor() {
    super();
    this._routes = new Routes(this, [
      { path: "/", render: () => html`<div>Child</div>` },
    ]);
    this.navigator = new Navigation(this);
  }

  render() {
    return this._routes.outlet();
  }
}
customElements.define("child-view", ChildView);
```

**After** (explicit wiring, no Context API)
```js
import { LitElement } from "lit";
import { Routes, Navigation } from "lit-router";

class ChildView extends LitElement {
  constructor() {
    super();
    this._routes = new Routes(this, [
      { path: "/", render: () => html`<div>Child</div>` },
    ]);

    this.navigator = new Navigation(this, {
      mode: "explicit",
      current: this._routes,
      parent: this._parentRoutes, // injected by the parent
      root: globalThis.__lit_router_main,
    });
  }

  render() {
    return this._routes.outlet();
  }
}
customElements.define("child-view", ChildView);
```

## Phase 3 (hardening): scoped trees
If you operate multiple router trees on the same page, add `scopeId` and `instanceId` to constrain discovery.

### Example: scoped tree with portal support

**Before** (unscoped discovery)
```js
const routes = new Routes(this, childRoutes);
const router = new Router(this, parentRoutes);
```

**After** (scoped discovery)
```js
const router = new Router(this, parentRoutes, {
  scopeId: "app",
  instanceId: "root-1",
});

const routes = new Routes(this, childRoutes, {
  scopeId: "app",
  instanceId: "child-1",
});
```

## Notes
- Event-based discovery remains the default and stays portal-safe.
- Explicit wiring is optional and intended for advanced compositions or performance tuning.
