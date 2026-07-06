import { html, LitElement } from "lit";

/**
 * @property {import("../RoutesController").RoutesController} instance
 *
 * @emits {import("../RoutesEvents.js").RoutesAcknowledgeEvent} lit-routes-acknowledge
 * @emits {import("../RoutesEvents.js").RoutesConnectedEvent} lit-routes-connected
 */
export class LitRouterOutlet extends LitElement {

  createRenderRoot() {
    return this;
  }

  render() {
    return html`<slot></slot>`;
  }
}

customElements.define("lit-router-outlet", LitRouterOutlet);
