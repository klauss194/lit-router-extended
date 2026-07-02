---
id: navigation-controller
name: Navigation Controller
order: 6
description: >
  Reference for the Navigation reactive controller: instantiation, reactive
  properties (url, pathname, params, searchParams, hash), navigation methods
  (navigate, push, pop, goback), child-route link building, hasFocus for
  active-state styling, Navigation.event subscription, and error handling.
---

## Navigation Controller

`Navigation` is a Lit Reactive Controller that gives any component access to the router without being a route itself. It discovers the nearest `Router` and `Routes` via DOM events — no props, context providers, or manual wiring.

```typescript
import { Navigation } from 'lit-router';

class UserProfile extends LitElement {
  nav = new Navigation(this);
}
```

The controller registers itself on the host via `addController(this)`. On connect, it dispatches `RouterAcknowledgeEvent` and `RoutesAcknowledgeEvent` which bubble up to the nearest `Router` and `Routes`. A subscription to the router delivers state changes that the controller re-dispatches as `Navigation.event` on the host.

### Reactive Properties

All properties read from the router and reflect the current navigation state.

```typescript
this.nav.url          // "/users/42?tab=posts#bio"
this.nav.pathname     // "/users/42"
this.nav.params       // { id: "42" }
this.nav.searchParams // { tab: "posts" }  — also has a setter
this.nav.hash         // "bio"             — also has a setter
this.nav.extraParams  // { draft: "abc" }
this.nav.routeName    // "user-detail"     — from route config name
```

The `searchParams` and `hash` setters update the URL bar without changing the path. The router re-renders the host automatically.

### `navigate(pathname, options?)`

Navigate to an absolute application path. Updates the browser URL bar via `history.pushState`.

```typescript
this.nav.navigate('/dashboard');
this.nav.navigate('/users/42', { hash: 'activity' });
this.nav.navigate('/search', { searchParams: { q: 'lit' } });
this.nav.navigate('/editor', { draftId: 'abc-123' });
```

Any extra keys in `options` beyond `searchParams` and `hash` are forwarded as `extraParams` — accessible in `enter`, `leave`, and `render` callbacks of the target route.

### `push(pathname, options?)`

Navigates deeper into a child route tree. Appends a relative path to the current route's matched segment and activates the matching child route.

Two conditions must be met:

1. The current route path ends with `*`. The wildcard captures the URL tail that the child matches against.
2. At least one child `Routes` controller exists in the DOM inside the parent's outlet.

When you call `push("./posts")`, the controller resolves the relative path against the current route, merges `extraParams` from the current state with any new ones, and calls `navigate()`. A new `history.pushState` entry is created — the browser back button retraces each push.

```typescript
class AdminLayout extends LitElement {
  nav = new Navigation(this);
  _tabs = new Routes(this, [
    { path: '/posts',   render: () => html`<posts-tab></posts-tab>` },
    { path: '/users',   render: () => html`<users-tab></users-tab>` },
    { path: '/reports', render: () => html`<reports-tab></reports-tab>` },
    { path: '/',        render: () => html`<dashboard-tab></dashboard-tab>` },
  ]);

  constructor() {
    super();
    this.addEventListener(Navigation.event, () => this.requestUpdate());
  }

  render() {
    const path = this.nav.pathname;
    const active = path.startsWith('/admin/posts') ? 'posts'
                 : path.startsWith('/admin/users') ? 'users'
                 : path.startsWith('/admin/reports') ? 'reports'
                 : 'dashboard';

    return html`
      <nav>
        <button ?active=${active === 'posts'}   @click=${() => this.nav.push('./posts')}>Posts</button>
        <button ?active=${active === 'users'}   @click=${() => this.nav.push('./users')}>Users</button>
        <button ?active=${active === 'reports'} @click=${() => this.nav.push('./reports')}>Reports</button>
      </nav>
      <main>${this._tabs.outlet()}</main>
    `;
  }
}
```

URL behavior:

- `/admin` → `DashboardTab` renders (`/` matches the empty tail)
- Click "Posts" → `push("./posts")` → URL becomes `/admin/posts`
- Click "Users" → `push("./users")` → URL becomes `/admin/users`

Options:

```typescript
this.nav.push('./detail', { preserveSearchParams: true });
this.nav.push('./editor', { draftId: 'abc-123' });
```

`push()` throws `InvalidNavigationError` if the current route does not end with `*` or if no child `Routes` controllers are present.

### `pop(options?)`

Navigates back out of a child route toward its parent. Strips the current tail segment from the URL.

When called, the controller checks if the current route has a tail group. If the URL is `/admin/posts` and the route `/admin/*` captured tail `/posts`, the controller navigates to `/admin` (the parent's link without the tail). If the current route has no tail but has a parent `Routes` controller, it navigates to the parent's link. If neither applies, it does nothing.

Like `push()`, `pop()` creates a new `history.pushState` entry — it does not call `history.back()`.

```typescript
import { LitElement, html, nothing } from 'lit';

class ArticleDetail extends LitElement {
  nav = new Navigation(this);
  _modal = new Routes(this, [
    {
      path: '/:slug',
      enter: async ({ params, signal }) => {
        this._article = await fetchArticle(params.slug, { signal });
        this.dialog.showModal();
      },
      render: ({ params }) =>
        html`<article-dialog .article=${this._article}></article-dialog>`,
    },
    {
      path: '*',
      render: () => { this.dialog.close(); return nothing; },
    },
  ]);

  private _onDialogClose = () => {
    if (this.dialog.returnValue === 'dismiss') {
      this.nav.pop();
    }
  };

  render() {
    return html`
      <dialog ${ref(this.dialog)} @close=${this._onDialogClose}>
        ${this._modal.outlet()}
      </dialog>
    `;
  }
}
```

Flow:

1. User is at `/articles`, clicks article link → `push("./my-post")`
2. URL becomes `/articles/my-post`, `enter` fires, `<dialog>` opens
3. User dismisses dialog → `close` event → `pop()`
4. URL returns to `/articles`, dialog closes

Options:

```typescript
this.nav.pop({ preserveSearchParams: true });
this.nav.pop({ searchParams: { tab: 'settings' } });
this.nav.pop({ hash: 'section-header' });
```

### `goback()`

Equivalent to `history.back()`.

```typescript
this.nav.goback();
```

### `Navigation.event`

The controller dispatches a `CustomEvent` with type `"navigation"` on the host element whenever route state changes. The event `detail` contains `prev` and `next` snapshots.

```typescript
class Breadcrumb extends LitElement {
  nav = new Navigation(this);

  constructor() {
    super();
    this.addEventListener(Navigation.event, () => this.requestUpdate());
  }

  render() {
    const segments = this.nav.pathname.split('/').filter(Boolean);
    return html`
      <nav>
        <a href="/">Home</a>
        ${segments.map((s, i) => {
          const href = '/' + segments.slice(0, i + 1).join('/');
          return html`<span> / </span><a href=${href}>${s}</a>`;
        })}
      </nav>
    `;
  }
}
```

For conditional re-rendering based on specific params:

```typescript
this.addEventListener(Navigation.event, ({ detail: { prev, next } }) => {
  if (next.params.id !== prev.params.id) {
    this.fetchData(next.params.id);
  }
});
```

The subscription delivers the current state immediately upon registration — the first event fires with `prev` as `undefined`.

### `hasFocus()`

Returns `true` when the current route has child routes but no active tail. Useful for active-state styling on navigation elements.

```typescript
class NavLink extends LitElement {
  nav = new Navigation(this);

  constructor() {
    super();
    this.addEventListener(Navigation.event, () => this.requestUpdate());
  }

  render() {
    return html`
      <a href=${this.href} class=${this.nav.hasFocus() ? 'active' : ''}>
        <slot></slot>
      </a>
    `;
  }
}
```

### `link(pathname?)`

Builds a relative URL against the current route without navigating.

```typescript
const childUrl = this.nav.link('./settings');  // "/admin/settings"
const parentUrl = this.nav.link();              // "/admin"
```

Throws `InvalidNavigationError` if child routes exist and `pathname` does not start with `./`.

### Error Handling

`navigate()`, `push()`, and `pop()` return Promises. Wrap calls in `try/catch` to handle navigation failures:

```typescript
async goToAdmin() {
  try {
    await this.nav.push('./settings');
  } catch (err) {
    console.error('Navigation failed:', err.message);
  }
}
```

For errors from `<a>` clicks, listen to `@lit-router-error` on a parent element:

```typescript
render() {
  return html`
    <section @lit-router-error=${(e) => console.error(e.detail.error.message)}>
      <a href="/broken-route">Broken Link</a>
    </section>
  `;
}
```
