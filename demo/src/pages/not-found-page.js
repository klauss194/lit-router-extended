import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

export class NotFoundPage extends LitElement {
  static properties = {
    pathname: { type: String },
  };

  static styles = sharedStyles;

  render() {
    return html`
      <div class="card">
        <h1>404 <span class="badge">catch-all *</span></h1>
        <p>No route matched <code>${this.pathname}</code>. This is the lowest-scored route in the
          table, so it only wins when nothing more specific matches.</p>
        <p><a href="/">&larr; go home</a></p>
      </div>
    `;
  }
}

customElements.define("not-found-page", NotFoundPage);
