import { LitElement, html } from "lit";
import { map } from "lit/directives/map.js";
import { styles } from "./styles.js";

export class AppDocsLayout extends LitElement {
  static styles = styles;
  static properties = {
    menuOptions: { type: Object },
  };

  _onAnchorClick(e) {
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) return;

    e.preventDefault();

    const id = href.slice(1);
    const target =
      this.querySelector(`#${id}`) ||
      this.querySelector(`app-docs-section[id="${id}"]`);
    if (!target) return;

    const headerHeight = 80;
    const top =
      target.getBoundingClientRect().top + window.scrollY - headerHeight;

    window.scrollTo({ top, behavior: "smooth" });
  }

  render() {
    return html`
      <div class="wrapper">
        <aside class="sidebar">
          <nav class="sidebar-nav" @click=${this._onAnchorClick}>
            ${map(
              this.menuOptions,
              (group) => html`
                <div class="sidebar-group">
                  <h4>${group.label}</h4>
                  <ul>
                    ${map(
                      group.items,
                      (item) => html`
                        <li><a href="${item.href}">${item.label}</a></li>
                      `,
                    )}
                  </ul>
                </div>
              `,
            )}
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
