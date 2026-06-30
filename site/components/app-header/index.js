import { LitElement, html } from "lit";
import { styles } from "./styles.js";

export class AppHeader extends LitElement {
  static styles = styles;

  render() {
    return html`
      <nav>
        <div class="inner">
          <a href="/" class="logo">lit-router</a>
          <a href="/get-started" class="cta">Get Started</a>
        </div>
      </nav>
    `;
  }
}

customElements.define("app-header", AppHeader);
