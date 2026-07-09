import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

export class HomePage extends LitElement {
  static styles = sharedStyles;

  render() {
    return html`
      <div class="card">
        <h1>lit-router-extended</h1>
        <p>
          Plain HTML + ES modules demo, no framework tooling beyond Vite for bare-specifier
          resolution. Everything below is a real <code>Router</code> route — check the event log
          at the bottom of the screen while you click around.
        </p>
        <ul>
          <li><a href="/about">/about</a> — static route, sync <code>enter</code> hook</li>
          <li><a href="/users">/users</a> — static route, async <code>enter</code> hook</li>
          <li><a href="/users/7">/users/:id</a> — dynamic param + async data fetch</li>
          <li><a href="/search/lit?tag=router">/search/:query?</a> — optional param + searchParams</li>
          <li><a href="/protected/4">/protected/:id</a> — async guard, cancels + redirects</li>
          <li><a href="/reports/1">/reports/:id</a> — async fetch with AbortSignal cancellation</li>
          <li><a href="/editor/1">/editor/:id</a> — sync <code>leave</code> guard</li>
          <li><a href="/admin">/admin/*</a> — nested <code>Routes</code>, push/pop</li>
          <li><a href="/nope">/*</a> — catch-all 404</li>
        </ul>
      </div>
    `;
  }
}

customElements.define("home-page", HomePage);
