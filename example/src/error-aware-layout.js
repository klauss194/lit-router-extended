import { html, LitElement, css } from "lit";

/**
 * <error-aware-layout>
 *
 * Wraps a Routes outlet and displays a dismissible error banner whenever a
 * child route error (@lit-router-error) bubbles up.
 *
 * Usage:
 *   <error-aware-layout>
 *     ${this.routes.outlet()}
 *   </error-aware-layout>
 *
 * --- What we learned about handling errors in lit-router ---
 *
 * ERRORS YOU CAN CATCH:
 *
 *   1. try/catch around navigate() / push() / pop()
 *      Catches: enter throws, leave throws, RouteNotFoundError.
 *      Wrap individual navigation calls in try/catch.
 *
 *   2. @lit-router-error DOM event
 *      Catches: child enter throws, child leave throws, anchor click errors.
 *      Listen on a parent element — the event bubbles from the failing
 *      child's host or from the <a> element.
 *
 *      connectedCallback() {
 *        this.addEventListener("lit-router-error", handler);
 *      }
 *
 * ERRORS YOU CANNOT CATCH:
 *
 *   - enter / leave returning false.
 *     This is a cancellation, not an error. No event, no exception.
 *
 *   - render() throwing.
 *     render runs inside Lit after navigation completes. Lit handles it.
 *     Not a navigation error — not dispatched as @lit-router-error.
 *
 * INVALID NAVIGATION ERRORS:
 *
 *   InvalidNavigationError is swallowed in ALL error paths. It signals
 *   cancellations (enter-callback, leave-callback, navigation-aborted)
 *   or validation failures (no-routes, invalid push). These are never
 *   exposed as events or exceptions to user code.
 *
 * COPY THIS PATTERN:
 *
 *   This component is copy-paste ready. Drop it into any project, wrap
 *   your outlets, and it will catch and display errors from any depth.
 */
export class ErrorAwareLayout extends LitElement {
  static properties = {
    _error: { type: Object, state: true },
  };

  static styles = css`
    :host { display: block; }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.4;
      color: #664d03;
    }

    .error-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffc107;
      color: #fff;
      border-radius: 50%;
      font-weight: 700;
      font-size: 14px;
    }

    .error-text {
      flex: 1;
      min-width: 0;
    }

    .error-text strong {
      font-family: monospace;
    }

    .error-close {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #664d03;
      padding: 0 0.25rem;
    }
  `;

  // Listen for @lit-router-error events bubbling from child routes and
  // anchor clicks. One listener covers every nested level.
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("lit-router-error", this._onRouteError);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("lit-router-error", this._onRouteError);
  }

  // e.target is the element that emitted the error — a child's host
  // element for child enter/leave errors, or an <a> for click errors.
  // e.error is the original Error object (not InvalidNavigationError).
  _onRouteError = (e) => {
    this._error = {
      source: e.target?.nodeName || "unknown",
      message: e.error?.message || "Unknown error",
    };

    // Auto-dismiss the banner after 8 seconds so it doesn't block the UI
    // permanently. Remove this if you prefer a persistent banner.
    clearTimeout(this._dismissTimer);
    this._dismissTimer = setTimeout(() => (this._error = null), 8000);
  };

  _dismiss() {
    clearTimeout(this._dismissTimer);
    this._error = null;
  }

  render() {
    return html`
      ${this._error
        ? html`
            <div class="error-banner" role="alert">
              <span class="error-icon">!</span>
              <span class="error-text">
                <strong>&lt;${this._error.source}&gt;</strong>
                ${this._error.message}
              </span>
              <button class="error-close" @click=${this._dismiss}>x</button>
            </div>
          `
        : null}
      <slot></slot>
    `;
  }
}
customElements.define("error-aware-layout", ErrorAwareLayout);
