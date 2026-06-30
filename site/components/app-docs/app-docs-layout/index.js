import { LitElement, html } from "lit";
import { map } from "lit/directives/map.js";
import { styles } from "./styles.js";

export class AppDocsLayout extends LitElement {
  static styles = styles;
  static properties = {
    menuOptions: { type: Object },
  };

  render() {
    return html`
      <div class="wrapper">
        <aside class="sidebar">
          <nav class="sidebar-nav">
            <h4>On this page</h4>
            <ul>
              ${map(this.menuOptions, (l) => html`
                <li><a href="${l.href}">${l.label}</a></li>
              `)}
            </ul>
          </nav>
        </aside>
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define("app-docs-layout", AppDocsLayout);
