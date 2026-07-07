---
id: route-matching-syntax
name: Route Matching Syntax
order: 4
---

| Pattern | Matches | Example |
|---------|---------|---------|
| **static** | Exact literal segment | `/about` matches `/about` |
| **`:param`** | Single segment | `/users/:id` matches `/users/42` |
| **`:param?`** | Zero or one optional segment | `/search/:query?` matches `/search/term` |
| **`*`** | Zero or more trailing segments (Catch-all) | `/admin/*` matches `/admin/settings` |
| **`:param*`** | Named capture of tail | `/files/:path*` captures `docs/readme.md` into `params.path` |

*(Note: Named wildcards are not compatible with nested structural routing. Use plain `*` for DOM-based nesting).*
