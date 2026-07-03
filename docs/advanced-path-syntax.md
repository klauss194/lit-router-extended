---
id: path-syntax
name: Advanced Path Syntaxes
order: 7
description: >
  Reference for lit-router path pattern syntax: static segments, dynamic parameters
  (:param, :param?), wildcards (*, :param*), scoring priority, and catch-all
  route patterns for 404 handling.
---

# Advanced Path Syntaxes

## Path Patterns

lit-router compiles route paths into regular expressions at construction time. The compiler supports four segment types, ranked by specificity.

| Pattern | Matches | Examples |
|---|---|---|
| Static | Exact literal segment | `/about`, `/users/profile` |
| `:param` | Any single non-slash segment | `/users/:id` matches `/users/42` |
| `:param?` | Zero or one non-slash segment | `/search/:query?` matches `/search` and `/search/term` |
| `*` | Everything after the prefix | `/admin/*` matches `/admin`, `/admin/settings/users` |
| `:param*` | Named wildcard capture | `/files/:path*` captures `docs/readme.md` into `params.path` |

Trailing slashes are tolerated — every compiled pattern ends with `/?$`. Matching is case-sensitive.

## Scoring Priority

Routes are ranked by a numeric score before matching. Higher scores are tried first, regardless of definition order.

| Segment type | Weight |
|---|---|
| Static | 1000 |
| Dynamic (`:param`) | 100 |
| Optional (`:param?`) | 10 |
| Depth (per segment) | 1 |
| Wildcard (`*`) | -50 |

Static routes always outrank dynamic ones. A route `/foo/bar` scores higher than `/foo/:param` even if the latter is defined first.

```typescript
class App extends LitElement {
  _router = new Router(this, [
    { name: 'dynamic', path: '/foo/:param', render: () => html`<dynamic-page></dynamic-page>` },
    { name: 'static',  path: '/foo/bar',    render: () => html`<static-page></static-page>` },
  ]);
}
```

- Navigating to `/foo/blue` matches `dynamic` — `:param` captures `"blue"`
- Navigating to `/foo/bar` matches `static` — the higher score wins over `dynamic`

## Wildcard

A trailing `*` matches zero or more remaining path segments. Use it to capture unknown sub-paths or enable nested routing.

```typescript
class App extends LitElement {
  _router = new Router(this, [
    { path: '/',              render: () => html`<home-page></home-page>` },
    { path: '/dashboard',     render: () => html`<dashboard-page></dashboard-page>` },
    { path: '/user/account',  render: () => html`<account-page></account-page>` },
    { path: '*',              render: () => html`<not-found></not-found>` },
  ]);
}
```

Navigating to `/user` matches `*` — the static route `/user/account` does not match because it requires the full segment. The wildcard acts as a catch-all 404.

A named wildcard `/:path*` captures the tail into `params`:

```typescript
{
  path: '/:missingUrl*',
  render: ({ params }) =>
    html`<not-found .url=${params.missingUrl}></not-found>`,
}
```

> **Note:** Named wildcards (`:param*`) capture tail segments but are not compatible with nested routing. Use plain `*` for routes that have child `Routes` controllers.
