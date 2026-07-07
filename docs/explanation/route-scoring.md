---
id: route-scoring
name: Route Scoring & Precedence
order: 3
---

## How Routes Are Scored

`lit-router` assigns a numeric score to every route at construction time. Routes are sorted descending by score, so **the most specific route is tried first**. The order in which you define them in the array does not matter.

| Segment type | Weight |
|---|---|
| Static | 1000 |
| Dynamic (`:param`) | 100 |
| Optional (`:param?`) | 10 |
| Depth (per segment) | 1 |
| Wildcard (`*`) | -50 |

## Scoring in Practice

1. **Static beats dynamic**: `/orders/list` (score ~2002) beats `/orders/:id` (score ~1102). 
2. **Deep routes outscore shallow ones**: `/blog/:year/:month` (score ~203) beats `/blog/:slug` (score ~102).
3. **Wildcard is the last resort**: Because `*` carries a negative penalty, a catch-all route `{ path: '*' }` will always be evaluated last, making it the perfect 404 handler.
