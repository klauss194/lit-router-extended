# Path Specification (`lit-router`)

## Overview

This document provides a comprehensive overview of route path specifications for `lit-router`, illustrating the different ways you can define and match routes in your application.

---

**Important Note on Route Matching Priority:**
Unlike simple routers that match top-to-bottom, `lit-router` uses a sophisticated `ReactRouterScorer`. Routes are automatically sorted by specificity before matching. The priority weight is: **Static (10) > Dynamic (5) > Optional (3) > Wildcard (1) > Catch-All (0.5)**. Array order *only* acts as a tie-breaker for routes with identical scores.

## Root Route

The root route matches the base path of your application (`/`). The router normalizes empty strings and whitespace-only strings using `.trim()`. If the resulting string is empty, it defaults to `"/"`.

**Example:**

```javascript
const routes = [
  // Due to string trimming and normalization, all three of these compile to "/"
  { path: ' ', render: () => html`<h1>Home 1</h1>` },
  { path: '/', render: () => html`<h1>Home 2</h1>` },
  { path: '', render: () => html`<h1>Home 3</h1>` },
];
```

**Note:** Because these three paths are completely identical after normalization, they will have the exact same match score. `lit-router` will fall back to array order, meaning `Home 1` will be rendered.

---

## Static Segments

Static segments are fixed path parts that match exactly. Trailing slashes in the URL are ignored by the route compiler (`/?$`), making them completely optional for static segments.

**Example:**

```javascript
const routes = [
  { path: '/about', render: () => html`<h1>About</h1>` },
  { path: '/about/license', render: () => html`<h1>License</h1>` },
  { path: '/contact/', render: () => html`<h1>Contact</h1>` },
  { path: '/dashboard', render: () => html`<h1>Dashboard</h1>` },
];
```

*Navigating to `/about/` will successfully match the `/about` route.*

---

## Dynamic Segments

Dynamic segments allow you to capture values from the URL. Prefix a segment with `:` to declare a parameter. You can use camelCase or snake_case for named params (e.g., `:paramName` or `:param_name`).

**Example:**

```javascript
const routes = [
  { path: '/user/:userId', render: ({ params }) => html`<h1>User: ${params.userId}</h1>` },
  { path: '/post/:article_title', render: ({ params }) => html`<h1>Post: ${params.article_title}</h1>` },
  { path: '/user/:userId/profile', render: ({ params }) => html`<h1>Profile for ${params.userId}</h1>` },
  { path: '/:postId/sections/:sectionId/edit', render: ({ params }) => html`<h1>Edit Section ${params.sectionId} of Post ${params.postId}</h1>` },
];
```

**Matches:**
- `/user/:userId` matches `/user/123`
- `/post/:article_title` matches `/post/lit-router-docs`
- `/:postId/sections/:sectionId/edit` matches `/08372/sections/1253/edit`

---

## Optional Parameters

Optional parameters allow you to match paths where the dynamic segment might be missing. Add a `?` after the parameter name to make it optional.

**Example:**

```javascript
const routes = [
  { path: '/search/:query?', render: ({ params }) => html`<h1>Search: ${params.query || 'All'}</h1>` },
  { path: '/dashboard/:widget?/details', render: ({ params }) => html`<h1>Dashboard: ${params.widget || 'General'} details</h1>` },
];
```

**Matches:**
- `/search/:query?` matches `/search` (params.query is undefined) AND `/search/react` (params.query is "react").
- `/dashboard/:widget?/details` matches `/dashboard/funnel/details` AND `/dashboard/details`.

---

## Optional Segments (Static)

You can also make completely static segments optional by appending a `?` to the segment name. 

**Example:**

```javascript
const routes = [
  { path: '/dashboard/legacy?', render: () => html`<h1>Dashboard Legacy</h1>` },
  { path: '/module/legacy?/link', render: () => html`<h1>Module Link</h1>` },
  { path: '/another/optional?/segment', render: () => html`<h1>Another segment</h1>` }
];
```

**Matches:**
- `/dashboard/legacy?` matches `/dashboard` AND `/dashboard/legacy`.
- `/module/legacy?/link` matches `/module/link` AND `/module/legacy/link`.
- `/another/optional?/segment` matches `/another/segment` AND `/another/optional/segment`.

---

## Wildcard Segments

Wildcards match any number of path segments. Use `*` for catch-all segments in the middle or end of a route. When you use a generic `*`, the router captures the matched string and assigns it to a **zero-indexed numeric key** (e.g., `params[0]`).

**Example:**

```javascript
const routes = [
  { path: '/post/:postId/*', render: ({ params }) => html`<h1>Post: ${params.postId}, Tail: ${params[0]}</h1>` },
  { path: '/landing/articles/*', render: ({ params }) => html`<h1>Article path: ${params[0]}</h1>` },
  { path: '*/license', render: ({ params }) => html`<h1>License for: ${params[0]}</h1>` }
];
```

**Matches:**
- `/post/:postId/*` matches `/post/1230/getting-started/lit`. `params.postId` is `"1230"`, `params[0]` is `"getting-started/lit"`.
- `*/license` matches `/lit-router/packages/router/license`. `params[0]` is `"lit-router/packages/router"`.

---

## Catch-All Routes

Catch-all routes match any path not handled by more specific routes. They are typically used for `404 Not Found` pages or propagating unmatched paths to child nested routers. 

Because `lit-router` scores Catch-All routes the lowest (`0.5`), you can safely place them anywhere in your array; they will always evaluate last.

### Using Standard Wildcards

If you use a basic wildcard (`*` or `/*`), the unmatched path fragment is placed in `params[0]`. *(Note: `lit-router` does **not** use the `splat` keyword).*

```javascript
const routes = [
  { 
    path: '*', // or '/*'
    render({ params }) {
      return html`<h1>Not Found: ${params[0]}</h1>`; // Accessible at params[0]
    }
  }
];
```

### Using Named Catch-Alls

If you want to assign a semantic name to the catch-all parameter, combine the dynamic parameter syntax with a wildcard (`/:paramName*`).

```javascript
const routes = [
  { 
    path: '/:catchAll*', 
    render({ params }) {
      return html`<h1>Not Found: ${params.catchAll}</h1>`;
    }
  }
];
```
