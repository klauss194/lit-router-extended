import { LitElement, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { styles } from "./styles.js";
import { features } from "./data.js";

export class AppFeatures extends LitElement {
  static styles = styles;

  render() {
    return html`
      <section class="section">
        <div class="grid">
          ${repeat(
            features,
            (f) => f.icon,
            (f) => html`
              <div class="card">
                <div class="card-icon">${f.icon}</div>
                <h3>${f.title}</h3>
                <p>${f.description}</p>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }
}

customElements.define("app-features", AppFeatures);
