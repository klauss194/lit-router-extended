import { LitElement, html } from "lit";
import { styles } from "./styles.js";

export class AppHero extends LitElement {
  static styles = styles;

  render() {
    return html`
      <section class="hero">
        <div class="content">
          <h1>Hierarchical routing for Lit, solved.</h1>
          <p class="subtitle">
            Advanced React-Router-style scoring, nested routes, and state
            management for the modern web.
          </p>
          <div class="actions">
            <a href="/get-started" class="cta">Get Started</a>
            <copy-console content="npm install lit-router"></copy-console>
          </div>
        </div>
      </section>
    `;
  }
}

customElements.define("app-hero", AppHero);
