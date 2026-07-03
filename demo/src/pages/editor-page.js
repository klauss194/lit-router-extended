import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

export class EditorPage extends LitElement {
  static properties = {
    params: { type: Object },
    _dirty: { state: true },
  };

  static styles = sharedStyles;

  constructor() {
    super();
    this._dirty = false;
  }

  _toggle(e) {
    this._dirty = e.target.checked;
    this.dispatchEvent(
      new CustomEvent("editor-dirty-changed", {
        bubbles: true,
        composed: true,
        detail: { dirty: this._dirty },
      }),
    );
  }

  render() {
    return html`
      <div class="card">
        <h1>Editor #${this.params?.id} <span class="badge">sync leave() guard</span></h1>
        <p>
          The route's <code>leave</code> hook checks a "dirty" flag kept on the owning app
          component (set via a bubbling <code>editor-dirty-changed</code> event) and calls the
          synchronous <code>confirm()</code>. Returning <code>false</code> aborts the navigation
          entirely — the URL stays put and this page remains mounted.
        </p>
        <label>
          <input type="checkbox" .checked=${this._dirty} @change=${this._toggle} />
          mark unsaved changes
        </label>
        <p>Try navigating away via the nav bar with the checkbox on vs off.</p>
      </div>
    `;
  }
}

customElements.define("editor-page", EditorPage);
