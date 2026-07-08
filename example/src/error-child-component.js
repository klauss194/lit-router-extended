import { html, LitElement } from "lit";
import { Routes } from "lit-router-extended";

/**
 * Nested child component for the Error Handling Demo.
 *
 * PURPOSE: Demonstrate the second error-surfacing path — childRouteConnected().
 *
 * When a child component mounts inside a parent's outlet, the parent calls
 * childRouteConnected() → child._gotoInternal() → child._navigate()
 * → child enter/leave fires.
 *
 * If enter/leave THROWS (not returns false):
 *   - childRouteConnected catches the error
 *   - dispatches RouterNavigationErrorEvent (@lit-router-error) on THIS host
 *   - the event bubbles up to the parent
 *
 * If enter/leave RETURNS FALSE:
 *   - InvalidNavigationError is thrown internally
 *   - childRouteConnected swallows it silently
 *   - no event, no error. Navigation cancelled.
 *
 * The parent cannot use try/catch here — onChildConnected() does not await
 * childRouteConnected(). The DOM event is the only surface.
 */
export class ErrorChild extends LitElement {
  static properties = {
    scenario: { type: String },
  };

  routes = new Routes(this, [
    {
      path: "/",
      enter: () => {
        if (this.scenario === "enter-throws") {
          // This error is caught by childRouteConnected() in Routes.js.
          // It dispatches @lit-router-error on this component's host.
          // The parent's try/catch around push() does NOT see it.
          // The parent catches it via addEventListener("lit-router-error", ...).
          throw new Error(
            "[child enter] Unexpected error in nested child route"
          );
        }
      },
      leave: () => {
        if (this.scenario === "leave-cancels") {
          // Returning false from leave silently cancels navigation.
          // canDeeplyLeave() returns false → InvalidNavigationError
          // → swallowed by childRouteConnected. No event fired.
          return false;
        }
      },
      render: () => {
        if (this.scenario === "enter-throws") {
          return html`<p>You should never see this — enter already threw.</p>`;
        }
        if (this.scenario === "leave-cancels") {
          return html`
            <p>Child route active. Pop to trigger leave cancel.</p>
          `;
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
