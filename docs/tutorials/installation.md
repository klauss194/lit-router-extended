---
id: installation
name: Installation & Basic Setup
order: 1
---

## Installation

Install `lit-router-extended` via npm. The package has no external dependencies.

```bash
npm install lit-router-extended
```

## Basic Setup

Create a `Router` instance inside your LitElement. `Router` is a [Reactive Controller](https://lit.dev/docs/composition/controllers/) — it manages route matching and triggers re-renders when the URL changes.

```typescript
import { LitElement, html } from 'lit';
import Router from 'lit-router-extended';

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

The `Router` intercepts all `<a>` clicks on `window` automatically.

## Rendering Outlets

To render the current matched route, call the controller's `outlet()` method inside the host LitElement's `render` function:

```javascript
render() {
  return html`<main>${this._router.outlet()}</main>`;
}
```

This generates a `<lit-router-outlet>` wrapper that renders your matched components and propagates lifecycle events.
