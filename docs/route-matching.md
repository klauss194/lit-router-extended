---
id: route-matching
name: Route Matching
order: 3
description: >
  How lit-router scores and ranks routes: static vs dynamic vs wildcard precedence,
  the scoring formula, catch-all patterns, optional parameters, route naming,
  and the guarantee that the most specific route always wins.
---

## Route Matching

lit-router compiles route paths into regular expressions at construction time. Paths are matched against the current URL segment by segment. Trailing slashes are tolerated — every compiled pattern ends with `/?$`. Matching is case-sensitive.

### Path Syntaxes

| Pattern | Matches                         | Example                                         |
|---------|---------------------------------|-------------------------------------------------|
| static  | Exact literal segment           | `/about` matches `/about`                       |
| `:param` | Single segment, non-slash chars | `/users/:id` matches `/users/42`                |
| `:param?` | Zero or one optional segment   | `/search/:query?` matches `/search` and `/search/term` |
| `*`       | Zero or more trailing segments  | `/admin/*` matches `/admin` and `/admin/settings/users` |
| `:param*` | Named capture of tail           | `/files/:path*` captures `docs/readme.md` into `params.path` |

### Scoring in Practice

lit-router assigns a numeric score to every route at construction time. Routes are sorted descending by score, so the most specific route is tried first — order of definition does not affect matching.

#### Static beats dynamic for the same prefix

```typescript
const _router = new Router(this, [
  { path: '/orders/list', render: () => html`<order-list></order-list>` },
  { path: '/orders/:id',  render: ({ params }) =>
    html`<order-detail id=${params.id}></order-detail>` },
]);
```

| URL | Matches | Because |
|---|---|---|
| `/orders/list` | `order-list` | `/orders/list` has 2 static segments vs `/orders/:id` with 1 static + 1 dynamic. The all-static route scores higher |
| `/orders/982` | `order-detail` | Nothing else matches the static route. `:id` captures `"982"` |
| `/orders/list/items` | nothing | Neither route matches. The static route requires an exact match; the dynamic route expects only one segment after `/orders/` |

#### Deep routes outscore shallow ones

```typescript
const _router = new Router(this, [
  { path: '/blog/:slug',        render: ({ params }) =>
    html`<blog-post slug=${params.slug}></blog-post>` },
  { path: '/blog/:year/:month', render: ({ params }) =>
    html`<blog-archive year=${params.year} month=${params.month}></blog-archive>` },
]);
```

| URL | Matches | Because |
|---|---|---|
| `/blog/my-post` | `blog-post` | Only `:slug` can match a single segment. `/blog/:year/:month` requires two segments |
| `/blog/2024/03` | `blog-archive` | Three segments total. The deeper route (`/blog/:year/:month`) has higher depth (+1 per segment) and scores above `/blog/:slug` because `depth × 1` breaks the tie after static segments are counted |

#### Dynamic routes never beat static siblings

```typescript
const _router = new Router(this, [
  { path: '/:section',   render: ({ params }) =>
    html`<section-page name=${params.section}></section-page>` },
  { path: '/settings',   render: () => html`<settings-page></settings-page>` },
  { path: '/:section/*', render: ({ params }) =>
    html`<section-layout section=${params.section}></section-layout>` },
]);
```

| URL | Matches | Because |
|---|---|---|
| `/settings` | `settings-page` | Static always outranks dynamic. Even though `/:section` could capture `"settings"`, the static route `/settings` scores ~1001 vs ~101 |
| `/dashboard` | `section-page` | No static route matches `dashboard`. `:section` captures `"dashboard"`. The wildcard `/:section/*` also matches but scores lower |
| `/dashboard/widgets` | `section-layout` | `:section` captures `"dashboard"`, wildcard `*` captures `/widgets`. Neither `:section` (which needs exactly one segment) nor `settings` (static mismatch) can match |

#### Wildcard is always last resort

```typescript
const _router = new Router(this, [
  { path: '/admin',      render: () => html`<admin-dashboard></admin-dashboard>` },
  { path: '/admin/*',    render: () => html`<admin-layout></admin-layout>` },
  { path: '/:page',      render: ({ params }) =>
    html`<cms-page name=${params.page}></cms-page>` },
  { path: '*',           render: () => html`<not-found></not-found>` },
]);
```

| URL | Matches | Because |
|---|---|---|
| `/admin` | `admin-dashboard` | Exact static match scores highest. `/admin/*` also matches but has a wildcard penalty |
| `/admin/users/42` | `admin-layout` | `/admin/*` captures the tail. The static `/admin` doesn't match because there are more segments. The dynamic `/:page` doesn't match because it expects exactly one segment |
| `/pricing` | `cms-page` | No static match for `pricing`. `:page` captures it. `*` also matches but scores lower |
| `/unknown/deep/path` | `not-found` | Nothing else matches — too many segments for `:page`, no prefix match for static routes. `*` catches everything as last resort |

### Catch-all and 404 Routes

A standalone `*` matches any URL not handled by specific routes. Because wildcards score lowest, more specific routes naturally win. The `*` can appear anywhere in the definition array — the scorer deprioritizes it regardless of position.

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

A named wildcard `/:param*` captures the tail into `params`:

```typescript
{
  path: '/:missingUrl*',
  render: ({ params }) =>
    html`<not-found .url=${params.missingUrl}></not-found>`,
}
```

> **Note:** Named wildcards (`:param*`) capture tail segments but are not compatible with nested routing. Use plain `*` for routes that have child `Routes` controllers.

### Route Names

Assign a `name` to routes for debugging or for use with the `Navigation` controller's `routeName` property:

```typescript
{ path: '/dashboard', name: 'dashboard', render: () => html`<dashboard-page></dashboard-page>` }

// In a child component:
// this.nav.routeName === 'dashboard'
```

### How Routes Are Scored

Routes are ranked by a numeric score before matching. Higher scores are tried first, regardless of definition order. Tiebreakers when scores are equal: specificity (ratio of static to total segments), then insertion order in the routes array.

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
