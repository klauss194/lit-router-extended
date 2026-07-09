import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

export class UserDetailPage extends LitElement {
  static properties = {
    params: { type: Object },
    user: { type: Object },
  };

  static styles = sharedStyles;

  render() {
    return html`
      <div class="card">
        <h1>User #${this.params?.id} <span class="badge">dynamic :id</span></h1>
        <p>
          Data resolved by the <code>enter</code> hook and stashed on the owning
          <code>demo-app</code> instance, then passed down as a property to this page's
          <code>render</code> callback.
        </p>
        <p>Fetched payload: <code>${JSON.stringify(this.user)}</code></p>
        <p><a href="/users">&larr; back to list</a></p>
      </div>
    `;
  }
}

customElements.define("user-detail-page", UserDetailPage);
