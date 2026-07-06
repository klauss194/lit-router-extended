---
id: getting-started
name: Getting Started
order: 9
description: Getting started example
---

## Getting Started

Welcome to `lit-router`! This guide will walk you through setting up a basic application, defining your first routes, and using our reactive controllers to manage navigation seamlessly.

**Let's start by creating your application's root component and instantiating the main `Router`**.

The `Router` is a reactive controller that listens to URL changes and determines which view to display. You define your routes as an array of objects, each containing a `path` and a `render` callback. Finally, you use the `outlet()` method inside your component's template to render the matched route.

> index.js
```javascript
import {html, LitElement} from "lit";
import {Router} from 'lit-router-extended';

export class AppRoot extends LitElement {
    router = new Router(this, [
        { path: '/', render: () => html`<div></div>` },
        { path: '/about', render: () => html`<div>About content</div>` },
        { path: '*', render: () => html`<strong>Page Not Found</strong>` },
    ]);

    render() {
        return html`
            <nav>
                <ul>
                    <a href="/"><li>Home</li></a>
                    <a href="/about"><li>About</li></a>
                    <a href="/foo"><li>Undefined Route</li></a>
                </ul>
            </nav>
            
            <main>${this._router.outlet()}</main>
        `;
    }
}
customElements.define('app-root', AppRoot);
```

Next, mount your root component in your HTML entry point just like any standard Web Component. The `Router` will automatically take over window.history and evaluate the current `URL`.

> index.html
```html
<html lang="en">
<head>
    <script src="/index.js" type="text/javascript" />
</head>
<body>
    <app-root></app-root>
</body>
</html>
```

### Contextual Routing with the Navigation Controller

While standard anchor tags (`<a href="...">`) work perfectly fine, real-world applications often require programmatic navigation and active-state management for menus.
Let's extract our navigation into a dedicated component. By instantiating the **`Navigation` controller**, we can programmatically navigate using the `navigate()` method and easily react to URL changes (__like applying an active class to the current route__).

> nav-component.js
```javascript
import {html, LitElement} from "lit";
import {classMap} from "lit-html/directives/class-map.js";
import {Navigation} from 'lit-router-extended';

export class AppNav extends LitElement {
    navigation = new Navigation(this);
    
    connectedCallback() {
        super.connectedCallback();
        this.addEventListener(Navigation.event, this.updateOnRouterChange);
    }
    
    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener(Navigation.event, this.updateOnRouterChange);
    }

    updateOnRouterChange = () => {
        this.requestUpdate();
    }

    render() {
        return html`
            <nav>
                <ul>
                    <li>
                      <button 
                        class=${classMap({"active": this.navigation.pathname === "/" })} 
                        @click=${() => this.navigation.navigate("/")} 
                      >Home</button>
                    </li>
                    <li>
                      <button 
                        class=${classMap({"active": this.navigation.pathname === "/about" })} 
                        @click=${() => this.navigation.navigate("/about")} 
                      >About</button>
                    </li>
                    <li>
                      <button 
                        class=${classMap({"active": this.navigation.pathname === "/foo" })} 
                        @click=${() => this.navigation.navigate("/foo")} 
                      >Foo</button>
                    </li>
                </ul>
            </nav>
        `;
    }
}

customElements.define('app-nav', AppNav);
```

Now, let's head back to `index.js` to implement our newly created `<app-nav>` component. This keeps our `AppRoot` clean and modular.

> index.js
```javascript
// .. rest of imports

import './nav-component.js';

export class AppRoot extends LitElement {
    //... rest of code
    render() {
        return html`
            <app-nav></app-nav>
            <main>${this._router.outlet()}</main>
        `;
    }
}
```

### Handling Imperative Navigation ("Go Back")

The `Navigation` controller isn't just for moving forward; it can also interact with browser history.
Let's create an `AppAbout` component to demonstrate how to trigger a programmatic **"back"** action using `this.navigation.goback()`. This is particularly useful for building custom UI elements like back buttons in mobile-like interfaces.

> about-component.js
```javascript
import {html, LitElement} from "lit";
import {classMap} from "lit/directives/class-map.js";
import {Navigation} from 'lit-router-extended';

export class AppAbout extends LitElement {
    navigation = new Navigation(this);

    render() {
        return html`
            <h1>About</h1>
            <p>
                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset's Body Type sheets. It has survived not only many decades, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised thanks to these sheets and more recently with desktop publishing software like Aldus PageMaker and Microsoft Word including versions of Lorem Ipsum.
            </p>
            <div>
               <button @click=${() => this.navigation.goback()}>Go Back</button>
            </div>
        `;
    }
}

customElements.define('app-about', AppAbout);
```

Finally, let's update our `AppRoot` again. We will inject the `<app-nav>` directly into the `Home` route's render callback, and assign our new `<app-about>` component to the **/about** path.

> index.js
```javascript
// ... rest of imports
import "./about-component.js"

export class AppRoot extends LitElement {
    router = new Router(this, [
        { path: '/', render: () => html`
            <app-nav></app-nav>
            <div><h1>Home Page</h1></div>`
        },
        { path: '/about', render: () => html`<app-about></app-about>` },
        { path: '*', render: () => html`
            <strong>Page Not Found</strong>
            <a href="/">go to home</a>`
        },
    ]);

    render() {
        return html`
            <main>${this.router.outlet()}</main>
        `;
    }
}
```

### Nested Routing (Sub-Routes)

Large applications often require nested layouts, such as a dashboard with its own internal navigation. `lit-router` makes this seamless through structural **DOM nesting**.
To create nested routes, the parent route must end with a wildcard (`*`). This tells the `Router` to capture the remaining URL (the "tail") and pass it down to any child `Routes` controller inside its outlet.
Let's create an `AppDashboard` component that manages its own sub-routes using the `Routes` controller (notice it's Routes, not `Router`).

> dashboard-component.js
```javascript
import { html, LitElement } from "lit";
import { Routes } from "lit-router-extended";

export class AppDashboard extends LitElement {
    // The child controller handling the URL tail
    routes = new Routes(this, [
        { path: '/', render: () => html`<h3>Dashboard Overview</h3>` },
        { path: '/settings', render: () => html`<h3>Dashboard Settings</h3>` },
        { path: '*', render: () => html`<h3>Section Not Found</h3>` },
    ]);

    render() {
        return html`
            <h2>Dashboard Layout</h2>
            <nav>
                <!-- Relative or absolute links work perfectly -->
                <a href="/dashboard">Overview</a>
                <a href="/dashboard/settings">Settings</a>
            </nav>
            
            <section class="dashboard-content">
                ${this.routes.outlet()}
            </section>
        `;
    }
}

customElements.define('app-dashboard', AppDashboard);
```

Now, we register the parent route in our `AppRoot` using the wildcard syntax:

> index.js
```javascript
// ... previous imports
import "./dashboard-component.js";

export class AppRoot extends LitElement {
    router = new Router(this, [
        // ... previous routes
        
        // IMPORTANT: The wildcard (*) allows tail propagation to AppDashboard
        { path: '/dashboard/*', render: () => html`<app-dashboard></app-dashboard>` },
    ]);
    // ... rest of the component
}
```

### Route-Driven Modals

A common UI requirement is opening a modal that has its own **distinct URL**, allowing users to share the link or use the browser's **"Back"** button to close it.
We can achieve this beautifully by combining native HTML `<dialog>` elements, nested routing, and the `push()` / `pop()` methods from the Navigation controller.
Let's create an `AppUsers` component that lists users. When a user is clicked, we **push** a new relative route. The enter hook opens the modal, and the `pop()` method safely closes it, restoring the parent URL.

> users-component.js
```javascript
import { html, LitElement, nothing } from "lit";
import { ref, createRef } from "lit/directives/ref.js";
import { Routes, Navigation } from "lit-router-extended";

export class AppUsers extends LitElement {
    navigation = new Navigation(this);
    dialogRef = createRef();

    modalRoutes = new Routes(this, [
        {
            // Matches /users/:id
            path: '/:id',
            enter: () => {
                // Open the native HTML dialog when the route is hit
                this.dialogRef.value?.showModal();
            },
            render: (ctx) => html`
                <h3>User Profile</h3>
                <p>Viewing details for user ID: <strong>${ctx.params.id}</strong></p>
            `
        },
        {
            // Fallback: If there's no tail (just /users), close the modal
            path: '*',
            render: () => {
                this.dialogRef.value?.close();
                return nothing;
            }
        }
    ]);

    // Handle native close events (like pressing the ESC key)
    onDialogClose = () => {
        if (this.dialogRef.value?.returnValue === 'dismiss') {
            this.navigation.pop(); // Reverts the URL tail automatically
        }
    }

    render() {
        return html`
            <h2>Users Directory</h2>
            
            <ul>
                <!-- push() appends the relative path to the current URL -->
                <li>
                    <button @click=${() => this.navigation.push('./101')}>
                        View User 101
                    </button>
                </li>
                <li>
                    <button @click=${() => this.navigation.push('./202')}>
                        View User 202
                    </button>
                </li>
            </ul>

            <!-- Native HTML Dialog -->
            <dialog ${ref(this.dialogRef)} @close=${this.onDialogClose}>
                <div class="modal-content">
                    ${this.modalRoutes.outlet()}
                </div>
                <form method="dialog">
                    <button value="dismiss">Close</button>
                </form>
            </dialog>
        `;
    }
}

customElements.define('app-users', AppUsers);
```

To test this, just add `{ path: '/users/*', render: () => html<app-users></app-users>}` to your root router. Notice how `push('./101')` changes the URL to **/users/101** and opens the modal. Clicking the "Close" button triggers a form submission that closes the `dialog` natively, triggering `@close`, which safely evaluates `pop()` to strip **/101** from the URL without triggering a full page reload!

