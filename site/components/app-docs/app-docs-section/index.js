import { LitElement, html } from "lit";
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

    this._renderMermaid();
  }

  async _renderMermaid() {
    const blocks = this.querySelectorAll("pre.mermaid:not([data-processed])");
    if (blocks.length === 0) return;

    const { default: mermaid } = await import("mermaid");
    mermaid.initialize({ startOnLoad: false, theme: "default" });

    let i = 0;
    for (const el of blocks) {
      try {
        const { svg } = await mermaid.render(`mermaid-${i++}`, el.textContent);
        el.innerHTML = svg;
        el.dataset.processed = "true";
      } catch (e) {
        el.innerHTML = `<code class="hljs">${e.message}</code>`;
        el.dataset.processed = "true";
      }
    }
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
