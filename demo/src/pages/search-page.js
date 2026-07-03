import { LitElement, html } from "lit";
import { Navigation } from "lit-router-extended";
import { sharedStyles } from "../shared-styles.js";

export class SearchPage extends LitElement {
  static properties = {
    ctx: { type: Object },
  };

  static styles = sharedStyles;

  nav = new Navigation(this);

  constructor() {
    super();
    this.addEventListener(Navigation.event, () => this.requestUpdate());
  }

  _onInput(e) {
    this.nav.searchParams = { ...this.nav.searchParams, tag: e.target.value };
  }

  _runSearch(e) {
    e.preventDefault();
    const q = new FormData(e.target).get("q");
    this.nav.navigate(`/search/${encodeURIComponent(q || "")}`, {
      searchParams: this.nav.searchParams,
    });
  }

  render() {
    const query = this.ctx?.params?.query;
    return html`
      <div class="card">
        <h1>Search <span class="badge">:query? optional</span></h1>
        <p>Matches both <code>/search</code> and <code>/search/:query</code>.</p>
        <form @submit=${this._runSearch}>
          <input name="q" placeholder="query" .value=${query || ""} />
          <button type="submit">Search</button>
        </form>
        <p>Current query param: <code>${query ?? "(none)"}</code></p>
        <p>
          Tag filter (mutates <code>searchParams</code> via setter, no navigation):
          <input .value=${this.nav.searchParams.tag || ""} @input=${this._onInput} placeholder="tag" />
        </p>
        <p>URL: <code>${this.nav.url}</code></p>
      </div>
    `;
  }
}

customElements.define("search-page", SearchPage);