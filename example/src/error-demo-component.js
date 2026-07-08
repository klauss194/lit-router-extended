import { html, LitElement } from "lit";
import { Routes, Navigation } from "lit-router-extended";
import "./error-child-component.js";
import "./error-aware-layout.js";

/**
 * Error Handling Demo.
 *
 * Demonstrates the three error-surfacing paths in lit-router and how the
 * developer interacts with each one.
 *
 * ARCHITECTURE — three callers, three behaviors (by design):
 *
 *   1. Caller: goto() / navigate() / push() / pop()
 *      Surface: try/catch. Errors propagate through the call chain.
 *      No @lit-router-error event needed — the caller has a Promise to await.
 *
 *   2. Caller: childRouteConnected() (child mounts, enter fires)
 *      Surface: @lit-router-error on the child's host element.
 *      No try/catch possible — caller (onChildConnected) is fire-and-forget.
 *
 *   3. Caller: _propagateNavigation() (fast-path, existing children)
 *      Surface: @lit-router-error on each failing child's host element.
 *      Per-child .catch() dispatches events. Siblings unaffected.
 *      No try/catch possible — errors are dispatched, not re-thrown.
 *
 * InvalidNavigationError (enter/leave cancelled, navigation-aborted) is
 * swallowed silently in ALL paths. It's not an error — it's a cancellation.
 */
export class ErrorDemo extends LitElement {
  navigation = new Navigation(this);

  routes = new Routes(this, [
    // --- Home ---
    {
      path: "/",
      render: () => html`
        <h3>Error Demo Home</h3>
        <p>Click each button. Watch the console and the @lit-router-error log below.</p>
      `
    },

    // ======================================================================
    // SCENARIO A — enter throws (caller: goto/navigate/push)
    //   Surface: try/catch around await push().
    //   The error propagates: _navigate() → _gotoInternal() → goto()
    //   → navigate() → push() → reaches caller's catch block.
    // ======================================================================
    {
      path: "/enter-throws",
      enter: async () => {
        throw new Error("[enter] API is down — fetch() failed");
      },
      render: () => html`<p>You should never see this.</p>`
    },

    // ======================================================================
    // SCENARIO B — enter returns false (caller: goto/navigate/push)
    //   Surface: NONE. Not an error — a cancellation.
    //   _navigate() throws InvalidNavigationError("enter-callback")
    //   → goto() swallows it → returns false → navigate() skips pushState.
    //   Developer sees: no URL change, current page stays, no error.
    // ======================================================================
    {
      path: "/enter-cancels",
      enter: () => {
        return false;
      },
      render: () => html`<p>You should never see this.</p>`
    },

    // ======================================================================
    // SCENARIO C — render throws
    //   Surface: Browser console only. No try/catch. No @lit-router-error.
    //   render() runs inside Lit's update cycle, AFTER push() resolved.
    //   Lit catches it — may show error boundary or crash the component.
    // ======================================================================
    {
      path: "/render-throws",
      render: () => {
        throw new Error("[render] Component render exploded!");
      },
    },

    // ======================================================================
    // SCENARIO D — leave throws (caller: goto/navigate/push)
    //   Surface: try/catch around await push()/pop().
    //   Same chain as enter: canDeeplyLeave() → _navigate() → goto()
    //   → navigate() → reaches caller's catch.
    // ======================================================================
    {
      path: "/leave-throws",
      leave: () => {
        throw new Error("[leave] Cleanup failed — could not sync draft");
      },
      render: () => html`<p>Navigate away to trigger the leave hook.</p>`
    },

    // ======================================================================
    // SCENARIO F — child enter throws (caller: childRouteConnected)
    //   Surface: @lit-router-error on <error-child>'s host element.
    //   childRouteConnected catches the error and dispatches
    //   RouterNavigationErrorEvent on child._host.
    //   No try/catch possible — onChildConnected is fire-and-forget.
    // ======================================================================
    {
      path: "/child-enter-throws",
      render: () => html`<error-child scenario="enter-throws"></error-child>`
    },

    // ======================================================================
    // SCENARIO G — child leave cancels (caller: childRouteConnected)
    //   Surface: NONE. Not an error — a cancellation.
    //   child's leave returns false → canDeeplyLeave returns false
    //   → InvalidNavigationError("leave-callback") → swallowed.
    //   Developer sees: no navigation change, current page stays.
    // ======================================================================
    {
      path: "/child-leave-cancels",
      render: () => html`<error-child scenario="leave-cancels"></error-child>`
    },

    // Catch-all
    { path: "/*", render: () => html`<p>Unknown error demo route.</p>` }
  ]);

  // -------------------------------------------------------------------
  // <error-aware-layout> wraps the outlet and shows a banner when any
  // child route error (@lit-router-error) bubbles up.
  // Copy error-aware-layout.js to reuse this pattern in your own project.
  // -------------------------------------------------------------------

  // --- Button handlers ---

  async testEnterThrows() {
    // Caller: goto/navigate/push chain. Surface: try/catch.
    try {
      await this.navigation.push("./enter-throws");
    } catch (err) {
      console.error("[try/catch] Caught enter error:", err.message);
    }
  }

  async testEnterCancels() {
    // enter returns false → InvalidNavigationError → swallowed by goto().
    // push() resolves without error. User stays on current page.
    await this.navigation.push("./enter-cancels");
    console.log("[try/catch] Enter cancelled — navigation blocked silently.");
  }

  async testRenderThrows() {
    // render errors happen AFTER push() resolves. try/catch sees nothing.
    // The error appears in the browser console from Lit's render cycle.
    try {
      await this.navigation.push("./render-throws");
      console.log("[try/catch] push() resolved. Render may have thrown — check console.");
    } catch (err) {
      // This catch block is unreachable for render errors.
      console.log("[try/catch] Unreachable for render errors.");
    }
  }

  async testLeaveThrows() {
    // Caller: goto/navigate/push chain. Surface: try/catch.
    try {
      await this.navigation.push("./leave-throws");
      await this.navigation.pop(); // triggers leave on /leave-throws
    } catch (err) {
      console.error("[try/catch] Caught leave error:", err.message);
    }
  }

  async testChildEnterThrows() {
    // Caller: childRouteConnected (fire-and-forget).
    // Surface: @lit-router-error on <error-child>'s host.
    // This try/catch does NOT see the error — it's dispatched as an event.
    try {
      await this.navigation.push("./child-enter-throws");
      console.log("[try/catch] push() resolved. Child error surfaced via @lit-router-error.");
    } catch (err) {
      // Unreachable for child enter errors.
      console.log("[try/catch] Unreachable for child enter errors.");
    }
  }

  async testChildLeaveCancels() {
    // Child leave returns false → navigation cancelled silently.
    await this.navigation.push("./child-leave-cancels");
    await this.navigation.pop();
    console.log("[try/catch] pop() resolved — child leave cancelled silently.");
  }

  render() {
    return html`
      <h2>Error Handling Demo</h2>
      <p style="color:#666;font-size:14px;">
        Open the browser console. Each button exercises a different error-surfacing path.<br>
        See <code>error-demo-component.js</code> for architecture documentation.
      </p>

      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
        <button @click=${this.testEnterThrows}>
          A: enter throws
        </button>
        <button @click=${this.testEnterCancels}>
          B: enter cancels (silent)
        </button>
        <button @click=${this.testRenderThrows}>
          C: render throws
        </button>
        <button @click=${this.testLeaveThrows}>
          D: leave throws
        </button>
        <button @click=${this.testChildEnterThrows}>
          F: child enter throws
        </button>
        <button @click=${this.testChildLeaveCancels}>
          G: child leave cancels (silent)
        </button>
      </div>

      <error-aware-layout>
        ${this.routes.outlet()}
      </error-aware-layout>
    `;
  }
}
customElements.define('error-demo', ErrorDemo);
