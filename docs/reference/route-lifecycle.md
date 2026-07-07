---
id: route-lifecycle
name: Route Lifecycle Signatures
order: 3
---

Every route can declare `enter`, `leave`, and `render`. 

### `enter` Callback
Runs before the route becomes active. Return `false` to cancel navigation.
```typescript
enter: (context: {
  params: Record<string, string>,
  extraParams: Record<string, any>,
  searchParams: Record<string, string>,
  hash: string,
  signal: AbortSignal,
  pathname: string,
  route: Route,
}) => Promise<boolean | void> | boolean | void
```

### `leave` Callback
Runs before navigating away. Return `false` to cancel.
```typescript
leave: (context: {
  params: Record<string, string>,
  extraParams: Record<string, any>,
  searchParams: Record<string, string>,
  hash: string,
  signal: AbortSignal,
}) => Promise<boolean | void> | boolean | void
```

### `render` Callback
Fires after `enter` succeeds.
```typescript
render: (context: {
  params: Record<string, string>,
  extraParams: Record<string, any>,
  searchParams: Record<string, string>,
  hash: string,
  route: Route,
}) => TemplateResult | nothing | null
```
