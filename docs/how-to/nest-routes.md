---
id: nest-routes
name: How to Nest Routes
order: 2
---

## Defining Nested Routes

To nest routes, the parent route must end with a wildcard `*`. The child component owns its own `Routes` controller to handle the tail of the URL.

```typescript
// 1. Root Router (Parent)
class AppRoot extends LitElement {
  _router = new Router(this, [
    // IMPORTANT: The wildcard captures the tail group
    { path: '/admin/*', render: () => html`<admin-layout></admin-layout>` },
  ]);

  render() { return html`<main>${this._router.outlet()}</main>`; }
}

// 2. Child Routes Controller
class AdminLayout extends LitElement {
  _routes = new Routes(this, [
    { path: '/',          render: () => html`<admin-dashboard></admin-dashboard>` },
    { path: '/users',     render: () => html`<admin-users></admin-users>` },
  ]);

  render() { return html`<main>${this._routes.outlet()}</main>`; }
}
```

## Adding Guards to Parent Routes

Parent routes can use `enter` to protect all child routes at once. If the parent's `enter` returns `false`, the children never evaluate.

```typescript
{
  path: '/admin/*',
  enter: () => isAdmin() || false,
  render: () => html`<admin-layout></admin-layout>`,
}
```
