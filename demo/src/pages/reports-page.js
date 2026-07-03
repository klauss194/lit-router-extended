import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

export class ReportsPage extends LitElement {
  static properties = {
    params: { type: Object },
    report: { type: Object },
  };

  static styles = sharedStyles;

  render() {
    return html`
      <div class="card">
        <h1>Report #${this.params?.id} <span class="badge">AbortSignal</span></h1>
        <p>
          The <code>enter</code> hook awaits a 1.5s simulated fetch, passed the hook's
          <code>signal</code>. Click between report links fast (before the fetch settles) — the
          in-flight fetch aborts and the event log prints "ABORTED" instead of "resolved" for the
          superseded navigation.
        </p>
        <p>
          <a href="/reports/1">#1</a> · <a href="/reports/2">#2</a> · <a href="/reports/3">#3</a>
        </p>
        <p>Loaded payload: <code>${JSON.stringify(this.report)}</code></p>
      </div>
    `;
  }
}

customElements.define("reports-page", ReportsPage);
