import { LitElement, html, css, nothing } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { Navigation, Routes } from "lit-router-extended";
import { sharedStyles } from "../shared-styles.js";

const USERS = [
  { id: "ada", name: "Ada Lovelace", role: "Mathematician" },
  { id: "grace", name: "Grace Hopper", role: "Rear Admiral" },
  { id: "alan", name: "Alan Turing", role: "Cryptanalyst" },
];

export class AdminUsersTab extends LitElement {
  static styles = [
    sharedStyles,
    css`
      dialog {
        background: #171a21;
        color: #e6e6e6;
        border: 1px solid #2a2f3a;
        border-radius: 10px;
        padding: 1.25rem 1.5rem;
      }
      dialog::backdrop {
        background: rgba(0, 0, 0, 0.6);
      }
    `,
  ];

  nav = new Navigation(this);
  _dialogRef = createRef();

  _modal = new Routes(this, [
    {
      name: "user-modal",
      path: "/:id",
      render: ({ params }) => {
        const user = USERS.find((u) => u.id === params.id);
        queueMicrotask(() => this._dialogRef.value?.showModal());
        return html`
          <dialog ${ref(this._dialogRef)} @close=${this._onDialogClose}>
            <h2>${user?.name ?? "Unknown"}</h2>
            <p>${user?.role}</p>
            <form method="dialog">
              <button value="dismiss">Close (pop())</button>
            </form>
          </dialog>
        `;
      },
    },
    {
      name: "user-modal-closed",
      path: "*",
      render: () => {
        this._dialogRef.value?.close();
        return nothing;
      },
    },
  ]);

  _onDialogClose = () => {
    if (this._dialogRef.value?.returnValue === "dismiss") {
      this.nav.pop();
    }
  };

  render() {
    return html`
      <p>Click a user to <code>push('./' + id)</code> into a modal; closing it <code>pop()</code>s back.</p>
      <ul>
        ${USERS.map(
          (u) => html`<li><a href=${this.nav.link(`./${u.id}`)} @click=${(e) => this._open(e, u.id)}>${u.name}</a></li>`,
        )}
      </ul>
      ${this._modal.outlet()}
    `;
  }

  _open(e, id) {
    e.preventDefault();
    this.nav.push(`./${id}`);
  }
}

customElements.define("admin-users-tab", AdminUsersTab);
