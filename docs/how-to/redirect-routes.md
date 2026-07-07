---
id: redirect-routes
name: How to Redirect Inside Routes
order: 3
---

## The Redirect Pattern

The correct way to redirect a user inside an `enter` callback is to call `goto()` followed by `return false`. This tells the router to stop processing the current route and prevents the URL bar from updating twice.

```typescript
{
  path: '/dashboard',
  enter: async () => {
    if (!auth.isLoggedIn) {
      await this._router.goto('/login');
      return false; // required — cancels the /dashboard navigation
    }
  },
  render: () => html`<dashboard-page></dashboard-page>`,
}
```
