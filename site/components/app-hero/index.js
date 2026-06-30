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
            <div class="terminal">
              <span class="icon">terminal</span>
              <code>npm install lit-router</code>
              <button class="copy" aria-label="Copy command">content_copy</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }
}

customElements.define("app-hero", AppHero);
