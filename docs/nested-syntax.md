---
id: nested-syntax
name: Nested Routing
order: 5
description: >
  How to nest Routes controllers in lit-router: wildcard (*) on parent routes,
  tail group propagation to child controllers, outlet() rendering, enter guards
  on parent routes, and common pitfalls when nesting without a wildcard.
---

## Nested Routing

lit-router nests routes through multiple `Routes` controllers connected in the DOM tree. A parent controller delegates the unmatched portion of the URL — the tail group — to a child controller inside its outlet.

### How Tail Propagation Works

A route ending with `*` captures everything after the matched static prefix as its tail group. When a child `Routes` controller connects inside the parent's outlet, the parent forwards the tail group to the child. The child then tries to match this tail against its own routes.

```
URL: /admin/users/42

Router matches /admin/*  →  tail group = "/users/42"
  └─ Renders <admin-layout>
       └─ Routes matches /users/:id  →  params.id = "42"
            └─ Renders <user-detail id="42">
```

### Defining Nested Routes

The root `Router` declares the wildcard. The child component owns its own `Routes` controller. No `children` array — nesting is structural, via the DOM.

```typescript
import { LitElement, html } from 'lit';
import Router, { Routes } from 'lit-router';

class AppRoot extends LitElement {
  _router = new Router(this, [
    { path: '/',          render: () => html`<home-page></home-page>` },
    { path: '/admin/*',   render: () => html`<admin-layout></admin-layout>` },
    { path: '*',          render: () => html`<not-found></not-found>` },
  ]);

  render() {
    return html`<main>${this._router.outlet()}</main>`;
  }
}
customElements.define('app-root', AppRoot);

class AdminLayout extends LitElement {
  _routes = new Routes(this, [
    { path: '/',          render: () => html`<admin-dashboard></admin-dashboard>` },
    { path: '/users',     render: () => html`<admin-users></admin-users>` },
    { path: '/users/:id', render: ({ params }) =>
      html`<user-detail id=${params.id}></user-detail>` },
    { path: '/settings',  render: () => html`<admin-settings></admin-settings>` },
    { path: '*',          render: () => html`<not-found></not-found>` },
  ]);

  render() {
    return html`
      <aside>
        <a href="/admin">Dashboard</a>
        <a href="/admin/users">Users</a>
        <a href="/admin/settings">Settings</a>
      </aside>
      <main>${this._routes.outlet()}</main>
    `;
  }
}
customElements.define('admin-layout', AdminLayout);
```

The `outlet()` method renders a `<lit-router-outlet>` custom element that projects children into the Light DOM. This allows nested `Routes` controllers to discover each other through DOM events — no manual wiring, no prop drilling.

### Guards on Parent Routes

Parent routes can use `enter` to protect all child routes at once. If the parent's `enter` returns `false`, the children never evaluate.

```typescript
{
  path: '/admin/*',
  enter: () => isAdmin() || false,
  render: () => html`<admin-layout></admin-layout>`,
}
```

### Common Mistake

Forgetting the `*` on the parent route prevents the tail group from propagating. The child receives only the matched static portion and cannot match deeper paths.

```typescript
// Wrong — /admin/settings never reaches the child
{ path: '/admin', render: () => html`<admin-layout></admin-layout>` }

// Correct — wildcard captures the tail
{ path: '/admin/*', render: () => html`<admin-layout></admin-layout>` }
```

### Navigation Flow

```mermaid
graph TD
    R[Router: /] --> H[Home]
    R --> A[/admin/*]
    A --> G{enter: isAdmin?}
    G -->|pass| AL[AdminLayout]
    G -->|false| NG[Navigation cancelled]
    AL --> AD[/]
    AL --> AU[/users]
    AL --> AUI[/users/:id]
    AL --> AS[/settings]

    style R fill:#171717,stroke:#fff,color:#fff
    style A fill:#0d74ce,stroke:#fff,color:#fff
    style G fill:#ab6400,stroke:#fff,color:#fff
    style NG fill:#eb8e90,stroke:#fff,color:#171717
    style AL fill:#16a34a,stroke:#fff,color:#fff
    style AD fill:#f0f0f3,stroke:#dcdee0,color:#171717
    style AU fill:#f0f0f3,stroke:#dcdee0,color:#171717
    style AUI fill:#f0f0f3,stroke:#dcdee0,color:#171717
    style AS fill:#f0f0f3,stroke:#dcdee0,color:#171717
```

> **Note:** Named wildcards (`:param*`) are not compatible with nested routing. Use plain `*` for routes that have child `Routes` controllers.
