# lit-router-extended - actively maintained & used 
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

Intuitive routing for Lit framework, inspired by React Router's powerful and flexible route matching.

---

## Root Route

The root route matches the base path of your application (`/` or empty string). It is typically used to render the main landing page or dashboard.

**Example:**

- `/` or empty string (` `) with or without spaces will be handled as root path.

---

## Static Segments

Static segments are fixed path parts that match exactly. Use them for pages like `/about`, `/contact`, or `/dashboard`.

**Example:**

- `/about` will be handled as static route and matches `/about` or `/about/`. 

---

## Dynamic Segments

Dynamic segments allow you to capture values from the URL using parameters. Prefix a segment with `:` to declare a parameter and can use camelCase or snakCase to named params like `:paramName` or `:param_name`.

**Example:**

- `/user/:userId` matches `/user/123`
- `/post/:article_title` matches `/post/lit router docs` or `/post/lit-router-docs`.
- `/user/:userId/profile` matches `/user/123/profile`
- `/:postId/sections/:sectionId/edit` matches `/08372/sections/1253/edit`

---

## Optional params

Optional params let you match routes with optional parammetter at the end of the path. Add a `?` after the parameter name to make it optional.

**Example:**

- `/search/:query?`: Matches `/search` and `/search/react`

**Note**: Optional param be only available at the end of path.

---

## Optional Segments

Optional segments let you match routes with optional segment at the end of the path. Add a `?` after the parameter name to make it optional.

**Example:**

- `/dashboard/legacy?`: Matches `/dashboard` and `/dashboard/legacy`

**Note**: Optional param be only available at the end of path.

---

## Wildcard Segments

Wildcards match any number of path segments. Use `*` for catch-all segments after and before a route.

**Example:**

- `/post/:postId/*`: Matches `/post/1230/getting start with lit router` 
- `/landing/articles/*`: Matches `/landing/articles/getting start`
- `*/license`: Matches `/lit-router/packages/router/license` **(No implemented yet)**

**Note**: Willcard swegment be only available at the end of path.

---

## Catch-all

Catch-all routes match any path not handled by other routes. Pathless routes (no `path` property) are useful for layouts or error boundaries.

**Example:**

- `/*` and `*`: Matches all non-defined routes and pass the value as `splat` on params.
- `/:path*`: Matches all non-defined routes and pass it as named param.

**using default splat**: 
```js
[
    { 
        path: '/*', 
        render({ params }) {
            return html`<h1>${params.splat}</h1>`
        }
    }
]
```

**using named path**: 
```js
[
    { 
        path: '/:catchAll', 
        render({ params }) {
            return html`<h1>${params.catchAll}</h1>`
        }
    }
]
```

---


## Route Configuration Reference

- `path`: The route path pattern (static, dynamic, optional, wildcard)
- `render`: The component to render for the route
- `enter`: (optional) A function called before navigation to the route. Return `false` to block navigation, or perform async checks (e.g., authentication).
- `leave`: (optional) A function called before leaving the route. Return `false` to block navigation away, or perform cleanup logic.

**Example:**
```js
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
