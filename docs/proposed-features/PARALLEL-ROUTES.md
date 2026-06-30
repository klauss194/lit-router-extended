# Functional Proposal Specification

This document outlines the functional specification for implementing new routing features in the Lit Router system. It explains concepts and their configuration. The guide includes code examples and best practices for defining and managing new feature in routes within your application.

## Parallel Routes

Parallel routes allow you to define multiple independent areas of your UI that can navigate separately. This is useful for layouts with multiple sections, such as a main content area and a sidebar, where each section can have its own routing logic.

### Defining Parallel Routes

To define parallel routes, use the `outlets` property in your route configuration. Each key in the `outlets` object represents a named outlet, and its value is a function that returns the content for that outlet.

**Example:**

```javascript
const routes = [
  {
    path: "/dashboard",
    render: () => html`<dashboard-page></dashboard-page>`,
    outlets: {
      main: () => html`<div>Main Content</div>`,
      sidebar: () => html`<div>Sidebar Content</div>`,
    },
  },
];
```

In this example, the `main` and `sidebar` outlets are defined for the `/dashboard` route. Each outlet can render its own content independently.

### Benefits of Parallel Routes

- **Independent Navigation:** Each outlet can navigate independently, providing a more dynamic user experience.
- **Improved Modularity:** Parallel routes allow you to break down your UI into smaller, reusable components.
- **Better State Management:** By isolating navigation logic, you can manage state more effectively across different sections of your application.

```javascript
[
   {
		path: "/dashboard",
    render: () => html`<dashboard-page></dashboard-page>`,
		outlets: {
      main: () => html`<div> outlet content </div>`,
      sidebar: () => html`<div> another content </div>`
    },
		enter: () => {
			// ...
		},
		leave: () => {
			// ...
		}
	}
] 
```
