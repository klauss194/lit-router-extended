import { LitElement, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { styles } from "./styles.js";
import { links } from "./data.js";

export class AppFooter extends LitElement {
  static styles = styles;

  render() {
    return html`
      <footer>
        <div class="inner">
          <span class="brand">lit-router</span>
          <div class="links">
            ${repeat(links, (l) => l.href, (l) => html`
              <a href="${l.href}">${l.label}</a>
            `)}
          </div>
          <span class="copyright">
            &copy; 2024 Lit Router. Built for the modern web.
          </span>
        </div>
      </footer>
    `;
  }
}

customElements.define("app-footer", AppFooter);
