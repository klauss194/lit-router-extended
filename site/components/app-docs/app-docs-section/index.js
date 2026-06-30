import { LitElement, html, unsafeCSS } from "lit";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";

import { styles } from "./styles.js";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);

export class AppContentSection extends LitElement {
  static styles = styles;

  firstUpdated() {
    this.querySelectorAll("pre code").forEach((el) => {
      hljs.highlightElement(el);
    });
  }

  render() {
    return html`
      <section class="content-section">
        <slot></slot>
      </section>
    `;
  }
}

customElements.define("app-docs-section", AppContentSection);
