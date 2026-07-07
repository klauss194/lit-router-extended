import { LitElement, html, unsafeCSS } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { repeat } from "lit/directives/repeat.js";
import { styles } from "./styles.js";
import { ducuments } from "./data.js";
import hljsTheme from "highlight.js/styles/atom-one-dark.css?inline";

import "./app-docs-layout/index.js";
import "./app-docs-section/index.js";
import "../copy-console/index.js";


export class AppDocs extends LitElement {
  static styles = [styles, unsafeCSS(hljsTheme)];

  #flatSections = [];

  get menuOptions() {
    return Object.entries(ducuments).map(([key, quadrant]) => ({
      label: quadrant.title || key,
      items: (quadrant.sections || []).map((s) => ({
        href: `#${s.id}`,
        label: s.title,
      })),
    }));
  }

  get allSections() {
    if (this.#flatSections.length > 0) return this.#flatSections;

    this.#flatSections = Object.values(ducuments).flatMap(
      (q) => q.sections || [],
    );

    return this.#flatSections;
  }

  render() {
    return html`
      <app-docs-layout .menuOptions=${this.menuOptions}>
        ${repeat(
          this.allSections,
          (s) => s.id,
          (s) => html`
            <app-docs-section id=${s.id}>
              ${unsafeHTML(s.html)}
            </app-docs-section>
          `
        )}
      </app-docs-layout>
    `;
  }
}

customElements.define("app-docs", AppDocs);
