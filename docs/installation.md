---
id: installation
name: Installation
order: 1
description: >
  Quick-start guide for lit-router: npm install, Router instantiation in a LitElement,
  route definition with path and render callbacks, and the outlet() method for
  rendering matched components.
---

## Installation

Install lit-router via npm. The package has no external dependencies.

```bash
npm install lit-router
```

## Basic Setup

Create a `Router` instance inside your LitElement. `Router` is a [Reactive Controller](https://lit.dev/docs/composition/controllers/) — it manages route matching and triggers re-renders when the URL changes.

```typescript
import { LitElement, html } from 'lit';
import Router from 'lit-router';

class MyApp extends LitElement {
  _router = new Router(this, [
    { path: '/', render: () => html`<home-page></home-page>` },
    { path: '/users/:id', render: ({ params }) =>
      html`<user-profile id=${params.id}></user-profile>` },
  ]);

  render() {
    return html`
      <nav>
        <a href="/">Home</a>
        <a href="/users/123">Profile</a>
      </nav>
      <main>
        ${this._router.outlet()}
      </main>
    `;
  }
}

customElements.define('my-app', MyApp);
```

The `Router` intercepts all `<a>` clicks on `window` in capture phase. Same-origin links that are not `defaultPrevented`, not `router-ignore`, and have no modifier keys or `download` attribute are handled automatically — no event listeners needed. The click calls `e.preventDefault()` and `router.navigate()` internally.


## Rendering Outlets

To render the current matched route, call the controller's `outlet()` method inside the host LitElement's `render` function:
`outlet()` renders the component matched by the current URL. The `render` callback receives a context object with `{ params, extraParams, searchParams, hash, route }`. Dynamic segments like `:id` are available via `params.id`.

```javascript
render() {
  return html`<main>${this._router.outlet()}</main>`;
}
```

This generates a `<lit-router-outlet>` wrapper that propagates lifecycle events down to nested child routes automatically.


