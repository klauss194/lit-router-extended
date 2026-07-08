import { html, LitElement } from "lit";
import { Routes, Navigation } from "lit-router-extended";
import "./error-child-component.js";

/**
 * Error Handling Demo.
 *
 * This component exercises every error path in the enter/leave/render hook chain
 * and shows how (or if) the developer can catch each one.
 *
 * Key architecture insight from source:
 *   enter/leave are evaluated PER-LEVEL, not recursively.
 *   The parent's _navigate() commits first, then children receive the tail
 *   through childRouteConnected(), which calls child._gotoInternal() asynchronously
 *   via a DOM event handler (onChildConnected). That event handler does NOT await
 *   childRouteConnected(), so child-level errors that aren't InvalidNavigationError
 *   become unhandled Promise rejections — invisible to parent try/catch.
 */
export class ErrorDemo extends LitElement {
  navigation = new Navigation(this);

  /**
   * Routes used when the user clicks buttons that call this.navigation.push().
   * The parent route /error-demo/* has a wildcard, so push() works.
   */
  routes = new Routes(this, [
    {
      path: "/",
      render: () => html`
        <h3>Error Demo Home</h3>
        <p>Open the browser console. Each button below triggers a specific error scenario.</p>
      `
    },

    // ------------------------------------------------------------------
    // Scenario A: enter THROWS an unexpected error (e.g. fetch() fails)
    // Catchable: YES — try/catch around await push() catches it.
    // Chain: push() → navigate() → goto() → _gotoInternal() → _navigate()
    //        → throw Error → goto() re-throws (not InvalidNavigationError)
    //        → navigate() receives it → propagates to push() → caller's catch
    // ------------------------------------------------------------------
    {
      path: "/enter-throws",
      enter: async () => {
        // Simulate an API call that fails unexpectedly.
        // This is NOT a guard-cancellation (which would be return false).
        // This is a real error — network down, JSON parse failure, etc.
        throw new Error("[enter] Unexpected failure — API is down");
      },
      render: () => html`<p>You should never see this.</p>`
    },

    // ------------------------------------------------------------------
    // Scenario B: enter returns false (intentional cancellation)
    // Catchable: NO — this is NOT an error. It's swallowed silently.
    // Chain: _navigate() catches `canEnter === false` → throws
    //        InvalidNavigationError("enter-callback") → goto() swallows it
    //        → returns false → navigate() sees false → skips pushState
    //        → returns undefined to caller.
    // What the user sees: no URL change, no error, current page stays.
    // ------------------------------------------------------------------
    {
      path: "/enter-cancels",
      enter: () => {
        // Guard pattern: block navigation if user isn't authorized.
        // Return false → navigation is silently cancelled.
        // No error, no toast. User stays where they are.
        return false;
      },
      render: () => html`<p>You should never see this.</p>`
    },

    // ------------------------------------------------------------------
    // Scenario C: render THROWS synchronously
    // Catchable: NO via try/catch — render runs inside Lit's update cycle,
    //            AFTER navigation has already completed and pushState fired.
    //            Lit catches render errors and may show an error boundary.
    //            The browser console will show the unhandled error.
    // Chain: push() → navigate() → goto() → _navigate() → commit → requestUpdate()
    //        → pushState → router.outlet() → route.render() → BOOM
    //        This happens AFTER push() has already resolved.
    // ------------------------------------------------------------------
    {
      path: "/render-throws",
      render: () => {
        // This throws during Lit's render cycle, not during navigation.
        // try/catch around push() will NOT catch this —
        // the navigation Promise already resolved.
        throw new Error("[render] Component render exploded!");
      },
    },

    // ------------------------------------------------------------------
    // Scenario D: leave THROWS an unexpected error
    // Catchable: YES — same chain as enter throws.
    //   Navigate FROM a route with a throwing leave → error propagates
    // Chain: _navigate() → canDeeplyLeave() → leave.call() → throw
    //        → canDeeplyLeave re-throws → _navigate() re-throws
    //        → _gotoInternal() re-throws → goto() re-throws (not InvalidNavigationError)
    //        → navigate() re-throws → push() re-throws → caller's catch
    // ------------------------------------------------------------------
    {
      path: "/leave-throws",
      leave: () => {
        // Simulate cleanup that fails — e.g. syncing unsaved data fails.
        throw new Error("[leave] Cleanup failed — could not sync draft");
      },
      render: () => html`<p>Navigate away to see leave throw.</p>`
    },

    // ------------------------------------------------------------------
    // Scenario E: render returns undefined (no template)
    // Catchable: NO — it's not an error, just renders nothing.
    //            The outlet just shows empty content for this route.
    // ------------------------------------------------------------------
    {
      path: "/empty-render",
      render: () => undefined
    },

    // ------------------------------------------------------------------
    // Scenario F: child component with a throwing enter
    // Catchable: NO — childRouteConnected() is fire-and-forget
    //            (onChildConnected does NOT await it).
    //            The error becomes an unhandled Promise rejection.
    // Chain: parent _navigate() commits → requestUpdate() → Lit renders
    //        <error-child> → hostConnected() → RoutesConnectedEvent
    //        → onChildConnected() → this.childRouteConnected(child)
    //        (NOT AWAITED!) → child._gotoInternal() → _navigate()
    //        → child enter throws → childRouteConnected re-throws
    //        → rejected Promise, nobody awaits → unhandled rejection
    // ------------------------------------------------------------------
    {
      path: "/child-enter-throws",
      render: () => html`<error-child scenario="enter-throws"></error-child>`
    },

    // ------------------------------------------------------------------
    // Scenario G: child component where leave returns false
    // Catchable: NO — cancelled, silent.
    //            Navigation stays where it is.
    // ------------------------------------------------------------------
    {
      path: "/child-leave-cancels",
      render: () => html`<error-child scenario="leave-cancels"></error-child>`
    },

    // Catch-all for this Routes controller
    {
      path: "/*",
      render: () => html`<p>Unknown error demo sub-route.</p>`
    }
  ]);

  // --- Button handlers — each demonstrates the correct way to handle errors ---

  async testEnterThrows() {
    try {
      await this.navigation.push("./enter-throws");
    } catch (err) {
      // This WILL fire. err is the original Error thrown in enter.
      // Correct pattern: show a user-facing error UI.
      console.error("[handler] Caught enter error:", err.message);
      alert("Enter error caught: " + err.message);
    }
  }

  async testEnterCancels() {
    // enter returns false — no error thrown, navigate() resolves to undefined.
    // User stays on current page. No toast needed.
    await this.navigation.push("./enter-cancels");
    console.log("[handler] Enter cancelled — navigation was silently blocked.");
  }

  async testRenderThrows() {
    // WARNING: try/catch around push() will NOT catch render errors.
    // render happens inside Lit's update cycle after push() resolves.
    // The error appears in the browser console as an unhandled rejection.
    try {
      await this.navigation.push("./render-throws");
      console.log("[handler] push() resolved. But render may have thrown! Check console.");
    } catch (err) {
      // This line is NEVER reached for render errors.
      console.log("[handler] This catch block is unreachable for render errors.");
    }
  }

  async testLeaveThrows() {
    // First navigate to the leave-throws route, then navigate away from it.
    // The leave hook fires during the SECOND navigation.
    try {
      await this.navigation.push("./leave-throws");
      // Now navigate away — this triggers the leave hook on /leave-throws
      await this.navigation.pop();
    } catch (err) {
      // This WILL fire. err is from the leave hook.
      console.error("[handler] Caught leave error:", err.message);
      alert("Leave error caught: " + err.message);
    }
  }

  async testChildEnterThrows() {
    // The child's enter throws asynchronously through childRouteConnected()
    // which is NOT awaited by onChildConnected. The error becomes an
    // unhandled Promise rejection — this try/catch does NOT catch it.
    try {
      await this.navigation.push("./child-enter-throws");
      console.log("[handler] push() resolved. But check console for unhandled rejection!");
    } catch (err) {
      // This is NEVER reached for child enter errors.
      console.log("[handler] This catch block is unreachable for child enter errors.");
    }
  }

  async testChildLeaveCancels() {
    // Navigate to child-leave-cancels, then navigate away.
    // The child's leave returns false → canDeeplyLeave returns false
    // → InvalidNavigationError("leave-callback") → swallowed → no navigation.
    try {
      await this.navigation.push("./child-leave-cancels");
      await this.navigation.pop();
      console.log("[handler] pop() resolved — but navigation was silently cancelled.");
    } catch (err) {
      // This is NOT reached for leave returning false.
      console.log("[handler] Not reached — leave cancellations are swallowed.");
    }
  }

  render() {
    return html`
      <h2>Error Handling Demo</h2>
      <p style="color:#666;font-size:14px;">
        Open the browser console and click each button.<br>
        Each scenario has inline comments in <code>error-demo-component.js</code>
        explaining whether the error is catchable and why.
      </p>

      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
        <button @click=${this.testEnterThrows}>
          A: enter throws (catchable)
        </button>
        <button @click=${this.testEnterCancels}>
          B: enter returns false (silent cancel)
        </button>
        <button @click=${this.testRenderThrows}>
          C: render throws (NOT catchable)
        </button>
        <button @click=${this.testLeaveThrows}>
          D: leave throws (catchable)
        </button>
        <button @click=${this.testChildEnterThrows}>
          F: child enter throws (NOT catchable)
        </button>
        <button @click=${this.testChildLeaveCancels}>
          G: child leave cancels (silent)
        </button>
      </div>

      <div style="border:1px solid #ccc;padding:1rem;">
        ${this.routes.outlet()}
      </div>
    `;
  }
}
customElements.define('error-demo', ErrorDemo);
