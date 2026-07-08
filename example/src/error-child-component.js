import { html, LitElement } from "lit";
import { Routes } from "lit-router-extended";

/**
 * Nested child component used by the Error Handling Demo.
 *
 * This component exists to demonstrate that errors thrown inside a CHILD'S
 * enter/leave hook become unhandled Promise rejections — they are NOT
 * catchable by the parent's try/catch.
 *
 * Why? Because the parent's childRouteConnected() is called from onChildConnected(),
 * which is an async event handler that does NOT await the result.
 * See AbstractController.js:148-164 and Routes.js:125-155.
 */
export class ErrorChild extends LitElement {
  static properties = {
    scenario: { type: String },
  };

  routes = new Routes(this, [
    {
      path: "/",
      enter: () => {
        // Scenario: enter-throws
        //   This error will appear as an unhandled Promise rejection in the
        //   browser console. The parent's try/catch around push() does NOT
        //   catch it because childRouteConnected() is fire-and-forget.
        if (this.scenario === "enter-throws") {
          throw new Error(
            "[child enter] Unexpected error in nested child route"
          );
        }
      },
      leave: () => {
        // Scenario: leave-cancels
        //   Returning false from a child's leave hook silently cancels
        //   navigation. canDeeplyLeave() returns false → InvalidNavigationError
        //   ("leave-callback") → swallowed at the parent level.
        //   The user stays on the current page.
        if (this.scenario === "leave-cancels") {
          return false;
        }
      },
      render: () => {
        if (this.scenario === "enter-throws") {
          return html`<p>You should never see this — enter already threw.</p>`;
        }
        if (this.scenario === "leave-cancels") {
          return html`<p>Child route active. Click "Pop" to trigger leave cancel.</p>`;
        }
        return html`<p>Unknown child scenario.</p>`;
      },
    },
  ]);

  render() {
    return html`
      <div style="border:2px dashed orange;padding:0.5rem;margin-top:0.5rem;">
        <strong style="color:orange;">[Child Component]</strong>
        <span>Scenario: ${this.scenario}</span>
        <div>${this.routes.outlet()}</div>
      </div>
    `;
  }
}
customElements.define('error-child', ErrorChild);
