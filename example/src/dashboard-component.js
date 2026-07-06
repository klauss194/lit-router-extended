import { html, LitElement } from "lit";
import { Routes } from "lit-router-extended";

export class AppDashboard extends LitElement {
    routes = new Routes(this, [
        { path: '/', render: () => html`<h3>Dashboard Overview</h3>` },
        { path: '/settings', render: () => html`<h3>Dashboard Settings</h3>` },
        { path: '*', render: () => html`<h3>Section Not Found</h3>` },
    ]);

    render() {
        return html`
            <h2>Dashboard Layout</h2>
            <nav style="margin-bottom: 1rem;">
                <a href="/dashboard">Overview</a> | 
                <a href="/dashboard/settings">Settings</a>
            </nav>
            
            <section style="border: 1px solid #ccc; padding: 1rem;">
                ${this.routes.outlet()}
            </section>
        `;
    }
}
customElements.define('app-dashboard', AppDashboard);
