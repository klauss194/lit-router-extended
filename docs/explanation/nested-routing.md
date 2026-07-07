---
id: nested-routing
name: Architecture of Nested Routing
order: 4
---

## Structural DOM Nesting

`lit-router` avoids giant, centralized configuration objects. Instead, nesting is structural. A parent `Router` delegates the unmatched portion of the URL to a child `Routes` controller sitting inside its DOM outlet. 

### How Tail Propagation Works

A route ending with `*` captures everything after the matched static prefix. This unmatched portion is called the **tail group**.

```text
URL: /admin/users/42

Router matches /admin/*  →  tail group = "/users/42"
  └─ Renders <admin-layout>
       └─ Child Routes matches /users/:id  →  params.id = "42"
            └─ Renders <user-detail id="42">
```

### The Missing Wildcard Mistake

A common mistake is omitting the `*` on the parent route. Without it, the router assumes an exact static match. The tail group is never created, and the child `<admin-layout>` never receives the remaining URL segments to parse.

```typescript
// Wrong — /admin/settings fails because exact match is required
{ path: '/admin', render: () => html`<admin-layout></admin-layout>` }

// Correct — wildcard captures the tail for the child routes
{ path: '/admin/*', render: () => html`<admin-layout></admin-layout>` }
```
