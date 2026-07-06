import { html, LitElement, nothing } from "lit";
import { ref, createRef } from "lit/directives/ref.js";
import { Routes, Navigation } from "lit-router-extended";

export class AppUsers extends LitElement {
    navigation = new Navigation(this);
    dialogRef = createRef();

    modalRoutes = new Routes(this, [
        {
            path: '/:id',
            enter: () => {
                this.dialogRef.value?.showModal();
            },
            render: (ctx) => html`
                <h3>User Profile</h3>
                <p>Viewing details for user ID: <strong>${ctx.params.id}</strong></p>
            `
        },
        {
            path: '*',
            render: () => {
                this.dialogRef.value?.close();
                return nothing;
            }
        }
    ]);

    onDialogClose = () => {
        if (this.dialogRef.value?.returnValue === 'dismiss') {
            this.navigation.pop();
        }
    }

    render() {
        return html`
            <h2>Users Directory</h2>
            
            <ul>
                <li>
                    <button @click=${() => this.navigation.push('./101')}>
                        View User 101
                    </button>
                </li>
                <li style="margin-top: 0.5rem;">
                    <button @click=${() => this.navigation.push('./202')}>
                        View User 202
                    </button>
                </li>
            </ul>

            <dialog ${ref(this.dialogRef)} @close=${this.onDialogClose}>
                <div class="modal-content" style="padding: 1rem;">
                    ${this.modalRoutes.outlet()}
                </div>
                <form method="dialog" style="text-align: right;">
                    <button value="dismiss">Close</button>
                </form>
            </dialog>
        `;
    }
}
customElements.define('app-users', AppUsers);

