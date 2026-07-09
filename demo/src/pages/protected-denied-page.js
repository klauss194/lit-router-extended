import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

export class ProtectedDeniedPage extends LitElement {
  static properties = {
    params: { type: Object },
  };

  static styles = sharedStyles;

  render() {
    return html`
      <div class="card">
        <h1>Access denied for #${this.params?.id} <span class="badge">redirect target</span></h1>
        <p>
          You landed here because <code>/protected/:id</code>'s <code>enter</code> hook called
          <code>goto('/protected-denied/:id')</code> and returned <code>false</code>. Notice the
          URL bar updated to this route even though nothing called <code>navigate()</code>
          directly — that's <code>goto()</code>'s job.
        </p>
        <p><a href="/protected/4">&larr; try an allowed id</a></p>
      </div>
    `;
  }
}

customElements.define("protected-denied-page", ProtectedDeniedPage);
