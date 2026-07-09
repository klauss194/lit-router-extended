import { LitElement, html, css } from "lit";
import { Navigation } from "lit-router-extended";

export class DemoNav extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: #12141a;
      border-bottom: 1px solid #2a2f3a;
      padding: 0.75rem 1.5rem;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
    }
    a {
      color: #cfd6e2;
      text-decoration: none;
      font-size: 0.92rem;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
    }
    a:hover {
      background: #1d212b;
    }
    a.active {
      color: #7ab8ff;
      background: #16233d;
    }
    .brand {
      font-weight: 600;
      color: #fff;
      margin-right: 0.5rem;
    }
    .pathname {
      margin-left: auto;
      color: #5a6272;
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
    }
  `;

  nav = new Navigation(this);

  constructor() {
    super();
    this.addEventListener(Navigation.event, () => this.requestUpdate());
  }

  _linkClass(prefix) {
    const path = this.nav.pathname;
    const isActive = prefix === "/" ? path === "/" : path.startsWith(prefix);
    return isActive ? "active" : "";
  }

  render() {
    return html`
      <nav>
        <span class="brand">lit-router-extended demo</span>
        <a href="/" class=${this._linkClass("/")}>Home</a>
        <a href="/about" class=${this._linkClass("/about")}>About</a>
        <a href="/users" class=${this._linkClass("/users")}>Users</a>
        <a href="/search" class=${this._linkClass("/search")}>Search</a>
        <a href="/protected/42" class=${this._linkClass("/protected")}>Protected</a>
        <a href="/reports/7" class=${this._linkClass("/reports")}>Reports (async)</a>
        <a href="/editor/1" class=${this._linkClass("/editor")}>Editor (leave guard)</a>
        <a href="/admin" class=${this._linkClass("/admin")}>Admin (nested)</a>
        <a href="/does-not-exist" class=${this._linkClass("/does-not-exist")}>404 demo</a>
        <span class="pathname">${this.nav.url}</span>
      </nav>
    `;
  }
}

customElements.define("demo-nav", DemoNav);
