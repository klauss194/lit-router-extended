import { LitElement, html } from "lit";
import { Navigation } from "lit-router-extended";
import { sharedStyles } from "../shared-styles.js";

export class AdminSettingsTab extends LitElement {
  static styles = sharedStyles;

  nav = new Navigation(this);

  async _goBack() {
    try {
      await this.nav.pop();
    } catch (err) {
      console.error(err);
    }
  }

  render() {
    return html`
      <p>Settings tab content.</p>
      <button class="secondary" @click=${this._goBack}>pop() back to /admin</button>
    `;
  }
}

customElements.define("admin-settings-tab", AdminSettingsTab);
