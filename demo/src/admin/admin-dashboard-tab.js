import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

export class AdminDashboardTab extends LitElement {
  static styles = sharedStyles;

  render() {
    return html`<p>Dashboard tab content — default when <code>/admin</code> has no tail.</p>`;
  }
}

customElements.define("admin-dashboard-tab", AdminDashboardTab);
