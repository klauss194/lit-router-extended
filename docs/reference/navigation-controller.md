---
id: navigation-controller
name: Navigation Controller API
order: 2
---

`Navigation` is a Lit Reactive Controller that gives components access to the router without being a route itself.

```typescript
import { Navigation } from 'lit-router-extended';
class UserProfile extends LitElement {
  nav = new Navigation(this);
}
```

## Reactive Properties

- `this.nav.url` — e.g., `"/users/42?tab=posts#bio"`
- `this.nav.pathname` — e.g., `"/users/42"`
- `this.nav.params` — e.g., `{ id: "42" }`
- `this.nav.searchParams` — e.g., `{ tab: "posts" }` (has setter)
- `this.nav.hash` — e.g., `"bio"` (has setter)
- `this.nav.extraParams` — e.g., `{ draft: "abc" }`
- `this.nav.routeName` — e.g., `"user-detail"`

## Methods

- **`navigate(pathname, options?)`**: Navigates to an absolute application path.
- **`push(pathname, options?)`**: Navigates deeper into a child route tree using relative paths (e.g., `"./posts"`). Requires parent route to end with `*`.
- **`pop(options?)`**: Navigates back out of a child route toward its parent by stripping the tail segment.
- **`goback()`**: Equivalent to `history.back()`.
- **`link(pathname?)`**: Builds a relative URL against the current route without navigating.
- **`hasFocus()`**: Returns `true` when the current route has child routes but no active tail.

## Events

- **`Navigation.event`**: Dispatched on the host element whenever route state changes. Detail contains `prev` and `next` snapshots.
