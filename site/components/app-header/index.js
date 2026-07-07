import { LitElement, html } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

import { styles } from "./styles.js";
import githubIcon from "../../assets/GitHub_Invertocat_White.svg?raw";

export class AppHeader extends LitElement {
  static styles = styles;

  render() {
    return html`
      <nav>
        <div class="inner">
          <a href="/" class="logo">lit-router-extended</a>
          <a href="https://github.com/klauss194/lit-router-extended" class="cta">
            <span class="icon">${unsafeSVG(githubIcon)}</span>
            GitHub
          </a>
        </div>
      </nav>
    `;
  }
}

customElements.define("app-header", AppHeader);
