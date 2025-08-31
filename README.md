# lit-router-extended - actively maintained & used 
# webcomponents router
A fork of the original Lit Router (lit-labs router) that was written by Justing ( creator of Lit ) but extended and with modifications inspired by React Router
First Initial Version
- Ranking Scorer Instead of URLPattern ( URLPattern seems quite slow & heavy also not supported yet everywhere )
- Keeps the same philosophy of original @lit-labs/router in terms of rendering & composition
- added a leave() callback <-- this works as intended BUT KEEP MIND OF  parents & children ( it fires for both since you're leaving two segments )
- goto() Methods updates the URLbar
- EMIT global event on each navigation 
- you can pass params to the goto() method -- >  just to retreive them in the render () method 
-  #,? ,& ( url Data) 
 

# LIT Router

Intuitive routing for Lit framework,made to be a faster, powerful and flexible route matching.

---

## Root Route

The root route matches the base path of your application (`/` or empty `string`). It is typically used to render the main landing page or dashboard.

**Example:**

- `/` or empty string (` `) with or without spaces will be handled as root path.


```js
const routes = [
	{ path: ' ', render: () => html`<h1>Home 1</h1>` },
  { path: '/', render: () => html`<h1>Home 2</h1>` },
  { path: '', render: () => html`<h1>Home 3</h1>` },
];
```

**Note:** All this routes are equal to `'/'` so the router will matches the first one in order of definition, in this case `HOME 1` will be rendered.

---

## Static Segments

Static segments are fixed path parts that match exactly. Use them for pages like `/about`, `/contact`, or `/dashboard`.

**Example:**

- `/about` will be handled as static route and matches `/about` or `/about/`. 

```javascript
const routes = [
  { path: '/about', render: () => html`<h1>About</h1>` },
  { path: '/about/license', render: () => html`<h1>About</h1>` },
  { path: '/contact/', render: () => html`<h1>Contact</h1>` },
  { path: '/dashboard', render: () => html`<h1>Dashboard</h1>` },
];
```

---

## Dynamic Segments

Dynamic segments allow you to capture values from the URL using parameters. Prefix a segment with `:` to declare a parameter and can use camelCase or snakCase to named params like `:paramName` or `:param_name`.

**Example:**

```javascript
const routes = [
  { path: '/user/:userId', render: ({ params }) => html`<h1>User: ${params.userId}</h1>` },
  { path: '/post/:article_title', render: ({ params }) => html`<h1>Post: ${params.article_title}</h1>` },
  { path: '/user/:userId/profile', render: ({ params }) => html`<h1>Profile for ${params.userId}</h1>` },
  { path: '/:postId/sections/:sectionId/edit', render: ({ params }) => html`<h1>Edit Section ${params.sectionId} of Post ${params.postId}</h1>` },
];
```

Matches:

- `/user/:userId`: matches `/user/123`
- `/post/:article_title`: matches `/post/lit router docs` or `/post/lit-router-docs`.
- `/user/:userId/profile`: matches `/user/123/profile`
- `/:postId/sections/:sectionId/edit`: matches `/08372/sections/1253/edit`

---

## Optional params

Optional params let you match routes with optional parammetter at the end of the path. Add a `?` after the parameter name to make it optional.

**Example:**

```javascript
const routes = [
  { path: '/search/:query?', render: ({ params }) => html`<h1>Search: ${params.query || 'All'}</h1>` },
  { path: '/dashboard/:widget?/details', render: ({ params }) => html`<h1>Dashboard: ${params.widget || ''} details</h1>` },
];
```

Matches 

- `/search/:query?`: matches `/search` and `/search/react`
- `/dashboard/:widget?/details`: matches `/dashboard/funnel/details` and `/dashboard/details`

---

## Optional Segments

Optional segments let you match routes with optional segment at the end of the path. Add a `?` after the parameter name to make it optional.

**Example:**

- `/dashboard/legacy?`: Matches `/dashboard` and `/dashboard/legacy`

```javascript
const routes = [
  { path: '/dashboard/legacy?', render: () => html`<h1>Dashboard Legacy</h1>` },
  { path: '/module/legacy?/link', render: () => html`<h1>Dashboard link</h1>` },
];
```

Matches 

- `/dashboard/legacy?`: matches `/dashboard` and `/dashboard/legacy`
- `/module/legacy?/link`: matches `/module/link` and `/module/legacy/link`

---

## Wildcard Segments

Wildcards match any number of path segments. Use `*` for catch-all segments of a route.

**Example:**

- `/post/:postId/*`: Matches `/post/1230/getting start with lit router` 
- `/landing/articles/*`: Matches `/landing/articles/getting start`
- `*/license`: Matches `/lit-router/packages/router/license`

```javascript
const routes = [
  { path: '/post/:postId/*', render: ({ params }) => html`<h1>Post: ${params.postId}</h1>` },
  { path: '/landing/articles/*', render: () => html`<h1>Articles</h1>` },
  { path: '*/license', render: () => html`<h1>License</h1>` }, // Not implemented yet
];
```

---

## Catch-all

Catch-all routes match any path not handled by other routes. Pathless routes (no `path` property) are useful for layouts or error boundaries.

**Example:**

- `/*` and `*`: Matches all non-defined routes and pass the value as `splat` on params.
- `/:path*`: Matches all non-defined routes and pass it as named param.

**using default splat**: 
```javascript
[
    { 
        path: '*', 
        render({ params }) {
            return html`<h1>${params.splat}</h1>`
        }
    },
	{ 
        path: '/*', 
        render({ params }) {
            return html`<h1>${params.splat}</h1>`
        }
    }
]
```

**using named path**: 
```javascript
[
    { 
        path: '/:catchAll', 
        render({ params }) {
            return html`<h1>${params.catchAll}</h1>`
        }
    }
]
```

**Note:** All this routes are equal to `*` so the router will matches the first one in order of definition.

---


## Route Configuration Reference

`path`: The route path pattern (static, dynamic, optional, wildcard)
`render`: The component to render for the route
`enter`: (optional) A function called before navigation to the route. Return false to block navigation, or perform async checks (e.g., authentication).
`leave`: (optional) A function called before leaving the route. Return false to block navigation away, or perform cleanup logic.


**Example:**

```javascript
const routes = [
	{
		path: "/dashboard",
		render: () => html`<dashboard-page></dashboard-page>`,
		enter: () => {
			// Only allow if user is authenticated
			if (!isAuthenticated()) return false;
			return true;
		},
		leave: () => {
			// Confirm before leaving dashboard
			return window.confirm("Are you sure you want to leave the dashboard?");
		}
	}
];
```

## Router.goto and Parameter Precedence

The `Router.goto(pathname, params)` method is used to programmatically navigate to a route. It accepts a `pathname` and an optional `params` object, which can include:

- `searchParams`: Query parameters (object or URLSearchParams)
- `extraParams`: Additional custom parameters
- `hash`: Hash fragment

### Parameter Precedence:

When navigating, route parameters extracted from the path (e.g., `/user/:id`) always take precedence over any keys in `extraParams` or `searchParams` passed to `Router.goto`. This ensures that the URL structure defines the main context, and extra parameters are only used for additional data.

**Example:**

```javascript
// Route definition
// ...
const router = Router([
	{ path: '/user/:id', render: ({ params }) => html`<h1>User: ${params.id}</h1>` }
])
// ...

// Navigation
await router.goto('/user/42', { extraParams: { id: 'shouldNotOverride' } });
// params.id will be '42', not 'shouldNotOverride'

// Passing searchParams
await router.goto('/user/42', { searchParams: { tab: 'profile' } });
// params.id will be '42', params.tab will be 'profile'
```

**General Usage:**

```javascript
// Navigate to a route with query and hash
await router.goto('/dashboard', {
  searchParams: { view: 'stats' },
  hash: 'section2'
});
```

## API Reference: Router.goto

**Usage Example:**

```javascript
await router.goto(pathname, params = {})
```

- `pathname`: The target path to navigate to (string)
- `params`: Optional object with:
	- `searchParams`: Query parameters (object or URLSearchParams)
	- `extraParams`: Additional custom parameters
	- `hash`: Hash fragment

**Returns:**

- A Promise that resolves when navigation is complete. otherwise thrown an error.

```javascript
await router.goto('/profile', { searchParams: { tab: 'settings' }, hash: 'security' });
```
