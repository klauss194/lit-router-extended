---
id: error-handling
name: Error handling
order: 5
---

## Error handling

Routes can fail for many reasons — an API is down, data is malformed, cleanup throws. lit-router surfaces these errors through two mechanisms, depending on how the navigation was initiated.

### Errors from `navigate()`, `push()`, and `pop()`

When you call `navigate()`, `push()`, or `pop()` directly, the error propagates through the returned Promise. Wrap the call in `try/catch`:

```javascript
async _saveAndNavigate() {
  try {
    await this.nav.push("./settings");
  } catch (err) {
    this._showError(err);
  }
}

_showError(err) {
  this.errorMessage = err.message;
  this.requestUpdate();
}
```

This catches `enter` throwing unexpectedly, `leave` throwing unexpectedly, and `RouteNotFoundError`.

It also catches `push()` validation errors — calling `push()` on a route with no children, or a route that doesn't end with `*`, throws `InvalidNavigationError` immediately before any navigation starts.

#### Showing an error without leaving the page

If navigation fails, you may want to keep the user where they are and show a toast or inline message:

```javascript
async _goToDashboard() {
  try {
    await this.nav.navigate("/dashboard");
  } catch (err) {
    this.errorMessage = `Could not open dashboard: ${err.message}`;
    // User stays on current page. URL did not change.
  }
}
```

#### Redirecting to a fallback on failure

When a guarded route fails, redirect to a safe page:

```javascript
{
  path: "/admin/*",
  enter: async () => {
    try {
      await fetchUserPermissions();
    } catch {
      await this.router.navigate("/login?reason=error");
      return false;
    }
  },
  render: () => html`<admin-layout></admin-layout>`,
}
```

#### Distinguishing error types

Check `instanceof` to handle different failures differently:

```javascript
import { RouteNotFoundError } from "lit-router-extended";

try {
  await this.nav.navigate("/missing");
} catch (err) {
  if (err instanceof RouteNotFoundError) {
    this.nav.navigate("/not-found");
  } else {
    console.error(err);
  }
}
```

### Errors from nested child routes and anchor clicks

When a child component mounts and its `enter` throws, or when an anchor-click navigation fails, the error is dispatched as a `lit-router-error` DOM event on the failing element. These callers are fire-and-forget — there is no Promise to `await`, so events are the surface.

The event name is also available as `RouterNavigationErrorEvent.eventName` so you can reference it without hardcoding the string:

```javascript
import { RouterNavigationErrorEvent } from "lit-router-extended";
```

#### Listening on a parent component

One listener on the parent catches errors from any nesting depth:

```javascript
connectedCallback() {
  super.connectedCallback();
  this.addEventListener(RouterNavigationErrorEvent.eventName, (e) => {
    const source = e.target.nodeName;   // e.g. "ADMIN-LAYOUT", "A"
    const message = e.error.message;

    this.errorSource = source;
    this.errorMessage = message;
    this.requestUpdate();
  });
}

render() {
  return html`
    ${this.errorMessage ? html`<error-banner .message=${this.errorMessage}></error-banner>` : null}
    ${this.routes.outlet()}
  `;
}
```

The event bubbles from the failing child's host element or from the `<a>` element up to the parent. No per-link or per-child wiring needed.

#### Using an error-aware wrapper component

Extract the listener into a reusable component:

```javascript
// error-aware-layout.js
import { RouterNavigationErrorEvent } from "lit-router-extended";

class ErrorAwareLayout extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(RouterNavigationErrorEvent.eventName, (e) => {
      this._error = { source: e.target.nodeName, message: e.error.message };
      this.requestUpdate();
    });
  }

  render() {
    return html`
      ${this._error ? html`<error-banner .message=${this._error.message}></error-banner>` : null}
      <slot></slot>
    `;
  }
}
```

Then wrap any outlet:

```html
<error-aware-layout>
  ${this.routes.outlet()}
</error-aware-layout>
```

This pattern works anywhere — wrap it around your root outlet to catch errors from every route in the app.

### What is not an error

- **`enter` or `leave` returning `false`** — this is an intentional guard cancellation. The URL stays the same, no event fires, nothing is thrown to user code. It means "stop here, do not proceed." Use it for auth guards, validation checks, or unsaved-changes prompts.
- **`render()` throwing** — render runs inside Lit's update cycle after navigation completes. Lit handles it internally. It is not a navigation error and is not dispatched as `lit-router-error`.
- **`InvalidNavigationError` with cancellation reasons** — `enter-callback`, `leave-callback`, and `navigation-aborted` are swallowed silently. They signal intentional cancellations (enter/leave returned false, or a newer navigation aborted the current one). These are not errors.
- **`InvalidNavigationError` with validation reasons** — `no-routes` (empty route table, no fallback) and push validation failures (no children, no wildcard) are thrown as exceptions and do reach `try/catch`. These indicate a configuration problem, not a runtime guard.

### Choosing the right pattern

| Scenario | Pattern |
|---|---|
| Navigate and show error toast on failure | `try/catch` around `navigate()` / `push()` / `pop()` |
| Navigate and redirect to fallback on failure | `try/catch` + `navigate()` to fallback route |
| Catch errors from any nested child route | `addEventListener(RouterNavigationErrorEvent.eventName)` on parent |
| Catch errors from anchor clicks | `addEventListener(RouterNavigationErrorEvent.eventName)` on parent |
| Catch all errors app-wide | Wrap root outlet in `<error-aware-layout>` |
| Guard a route (auth, permissions) | `return false` from `enter` — not an error |
