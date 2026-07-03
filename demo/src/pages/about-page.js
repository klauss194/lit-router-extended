import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

export class AboutPage extends LitElement {
  static styles = sharedStyles;

  render() {
    return html`
      <div class="card">
        <h1>About <span class="badge">sync enter()</span></h1>
        <p>
          This route declares a synchronous <code>enter</code> hook that just logs and returns
          <code>undefined</code>. Any return value other than <code>false</code> lets the
          navigation proceed — sync or async, the contract is identical.
        </p>
      </div>
    `;
  }
}

customElements.define("about-page", AboutPage);
