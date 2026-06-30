import { css, html, LitElement } from "lit";

/**
 * @property {import("../RoutesController").RoutesController} instance
 *
 * @emits {import("../RoutesEvents.js").RoutesAcknowledgeEvent} lit-routes-acknowledge
 * @emits {import("../RoutesEvents.js").RoutesConnectedEvent} lit-routes-connected
 */
export class LitRouterOutlet extends LitElement {
  // static styles = css`
  //   :host {
  //       width: 100%;
  //       height: 100%;
  //       display: block;
  //       pointer-events: inherit;
  //   }`;

  createRenderRoot() {
    return this;
  }

  render() {
    return html`<slot></slot>`;
  }
}

customElements.define("lit-router-outlet", LitRouterOutlet);
