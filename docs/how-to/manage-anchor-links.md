---
id: manage-anchor-links
name: How to Manage Anchor Links
order: 1
---

## Basic Usage

Zero configuration is required for standard routing. Drop `<a>` elements anywhere in your templates, and `lit-router` will handle them.

```html
<nav>
  <a href="/">Home</a>
  <a href="/users">Users</a>
</nav>
```

Each click navigates to the target route, updates the URL bar, and scrolls to the top without a page reload.

## Passing Query Parameters and Hashes

The Router parses `?query` and `#hash` directly from the `href` attribute.

```html
<a href="/search?q=lit+router">Search results for "lit router"</a>
<a href="/docs#lifecycle">Jump to lifecycle section</a>
```
Both are accessible in the target route's `render` callback via the `searchParams` and `hash` properties on the context object.

## Excluding Links with `router-ignore`

Add the `router-ignore` attribute to any `<a>` that should bypass the Router. The browser will handle the click normally.

```html
<!-- External domains (handled automatically, but can be explicit) -->
<a router-ignore href="https://github.com/lit-router">View on GitHub</a>

<!-- Downloads -->
<a router-ignore href="/api/reports/export" download>Download Report</a>
```
*Note: The `target="_blank"` attribute already bypasses the Router automatically.*

## Handling Hash Links Within the Same Page

Links that point to `#section` on the current page need `router-ignore`. Without it, the Router intercepts the click, calls `navigate()`, and scrolls to the top.

```html
<!-- Correct: Browser scrolls to the #faq element -->
<a router-ignore href="#faq">Frequently Asked Questions</a>
```
