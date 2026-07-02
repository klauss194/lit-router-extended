import { LitElement, html } from "lit";
import { styles } from "./styles.js";

export class AppHero extends LitElement {
  static styles = styles;

  _onGetStarted = (e) => {
    e.preventDefault();

    const layout = document.querySelector("app-layout");
    const docs = layout?.shadowRoot?.querySelector("app-docs");
    const target = docs?.shadowRoot?.querySelector(
      'app-docs-section[id="installation"]'
    );
    if (!target) return;

    const headerHeight = 80;
    const top =
      target.getBoundingClientRect().top + window.scrollY - headerHeight;

    window.scrollTo({ top, behavior: "smooth" });
  };

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
            <button @click=${this._onGetStarted} class="cta">Get Started</button>
            <copy-console content="npm install lit-router"></copy-console>
          </div>
        </div>
      </section>
    `;
  }
}

customElements.define("app-hero", AppHero);
