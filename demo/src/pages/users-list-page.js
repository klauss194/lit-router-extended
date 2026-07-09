import { LitElement, html } from "lit";
import { sharedStyles } from "../shared-styles.js";

const USERS = [
  { id: 1, name: "Ada Lovelace" },
  { id: 2, name: "Grace Hopper" },
  { id: 3, name: "Alan Turing" },
  { id: 4, name: "Margaret Hamilton" },
];

export class UsersListPage extends LitElement {
  static styles = sharedStyles;

  render() {
    return html`
      <div class="card">
        <h1>Users <span class="badge">async enter()</span></h1>
        <p>
          The <code>enter</code> hook awaited a simulated fetch before this page rendered — watch
          the event log for the "fetch starting" / "fetch resolved" pair.
        </p>
        <ul>
          ${USERS.map((u) => html`<li><a href="/users/${u.id}">${u.name}</a></li>`)}
        </ul>
      </div>
    `;
  }
}

customElements.define("users-list-page", UsersListPage);
