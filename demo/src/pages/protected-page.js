import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

export class ProtectedPage extends LitElement {
  static properties = {
    params: { type: Object },
  };

  static styles = sharedStyles;

  render() {
    return html`
      <div class="card">
        <h1>Protected #${this.params?.id} <span class="badge">async guard — ALLOWED</span></h1>
        <p>
          The <code>enter</code> hook simulated an async auth check. Even ids pass, odd ids get
          redirected via <code>this._router.goto()</code> followed by <code>return false</code>
          (the documented redirect pattern — <code>goto</code> updates route state without
          double-pushing history).
        </p>
        <p>Try <a href="/protected/3">/protected/3</a> (odd → denied) vs
          <a href="/protected/4">/protected/4</a> (even → allowed).</p>
      </div>
    `;
  }
}

customElements.define("protected-page", ProtectedPage);
