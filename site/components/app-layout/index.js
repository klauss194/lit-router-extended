import { LitElement, html } from "lit";
import { styles } from "./styles.js";
import "../app-header/index.js";
import "../app-hero/index.js";
import "../app-features/index.js";
import "../app-docs-section/index.js";
import "../app-footer/index.js";

export class AppLayout extends LitElement {
  static styles = styles;

  render() {
    return html`
      <app-header></app-header>
      <main>
        <app-hero></app-hero>
        <app-features></app-features>
        <app-docs-section></app-docs-section>
      </main>
      <app-footer></app-footer>
    `;
  }
}

customElements.define("app-layout", AppLayout);
