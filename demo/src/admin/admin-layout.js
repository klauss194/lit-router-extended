import { LitElement, html, css } from "lit";
import { Navigation, Routes } from "lit-router-extended";
import { sharedStyles } from "../shared-styles.js";

import "./admin-dashboard-tab.js";
import "./admin-settings-tab.js";
import "./admin-users-tab.js";

export class AdminLayout extends LitElement {
  static styles = [
    sharedStyles,
    css`
      nav {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      nav button.active {
        background: #16233d;
        outline: 1px solid #2a5adb;
      }
    `,
  ];

  nav = new Navigation(this);

  _tabs = new Routes(this, [
    { name: "admin-dashboard", path: "/dashboard", render: () => html`<admin-dashboard-tab></admin-dashboard-tab>` },
    { name: "admin-settings", path: "/settings", render: () => html`<admin-settings-tab></admin-settings-tab>` },
    { name: "admin-users", path: "/users/*", render: () => html`<admin-users-tab></admin-users-tab>` },
    { name: "admin-index", path: "/", render: () => html`<admin-dashboard-tab></admin-dashboard-tab>` },
  ]);

  constructor() {
    super();
    this.addEventListener(Navigation.event, () => this.requestUpdate());
  }

  _tab() {
    const path = this.nav.pathname;
    if (path.includes("/settings")) return "settings";
    if (path.includes("/users")) return "users";
    return "dashboard";
  }

  render() {
    const active = this._tab();
    return html`
      <div class="card">
        <h1>Admin <span class="badge">nested Routes · push/pop</span></h1>
        <p>
          This layout renders at <code>/admin/*</code> and owns a child
          <code>Routes</code> controller. Tab buttons call
          <code>nav.push('./dashboard')</code> etc — <code>hasFocus()</code>
          (used for the "index" state) is <code>${this.nav.hasFocus()}</code>.
        </p>
        <nav>
          <button class=${active === "dashboard" ? "active" : "secondary"} @click=${() => this.nav.push("./dashboard")}>
            Dashboard
          </button>
          <button class=${active === "settings" ? "active" : "secondary"} @click=${() => this.nav.push("./settings")}>
            Settings
          </button>
          <button class=${active === "users" ? "active" : "secondary"} @click=${() => this.nav.push("./users")}>
            Users (nested modal demo)
          </button>
        </nav>
        ${this._tabs.outlet()}
      </div>
    `;
  }
}

customElements.define("admin-layout", AdminLayout);
