import { html, LitElement } from "lit";
import { Router } from "lit-router-extended";

import "./nav-component.js";
import "./users-component.js";
import "./about-component.js";
import  "./dashboard-component.js";

export class AppRoot extends LitElement {
    router = new Router(this, [
        {
            path: '/',
            render: () => html`
                <div><h1>Home Page</h1><p>Welcome to lit-router!</p></div>
            `
        },
        { path: '/about', render: () => html`<app-about></app-about>` },
        { path: '/dashboard/*', render: () => html`<app-dashboard></app-dashboard>` },
        { path: '/users/*', render: () => html`<app-users></app-users>` },
        {
            path: '*',
            render: () => html`
                <strong>Page Not Found 404</strong>
                <br>
                <a href="/">Go to Home</a>
            `
        },
    ]);

    // He movido <app-nav> fuera del render de las rutas para que siempre
    // sea visible durante tus pruebas, independientemente de la ruta activa.
    render() {
        return html`
            <app-nav></app-nav>
            <main style="padding: 1rem;">
                ${this.router.outlet()}
            </main>
        `;
    }
}
customElements.define('app-root', AppRoot);