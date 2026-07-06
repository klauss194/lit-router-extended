import { LitElement } from "lit";
import { Routes, Navigation } from "../../src/index.js";

/**
 * Helper to create components with nested routes using RoutesController
 *
 * @param {string} name
 * @param {{ name?:string; path:string; render(params?:any):import('lit').TemplateResult; enter?():boolean | undefined; leave?():boolean | undefined;}[]} routes
 *
 * @example
 * ```js
 * nestedRoutes("my-component", [
 *     {
 *         name: "home",
 *         path: "/",
 *         render: () => html`<h1>Home</h1>`,
 *     },
 *     {
 *         name: "section",
 *         path: "/section/:param",
 *         render: ({ params }) => html`<h1>Section ${params.param}</h1>`,
 *         enter() {
 *             console.log('enter');
 *         },
 *         leave() {
 *             console.log('leave');
 *         }
 *     },
 *     {
 *         name: "catch-all",
 *         path: "/*",
 *         render: () => html`<h1>Catch-all</h1>`,
 *     },
 * ]);
 * ```
 */
export default function nestedRoutes(name, routes = []) {
  const Class = class NestedRoutes extends LitElement {
    _routes;
    navigator;

    constructor() {
      super();
      this._routes = new Routes(this, routes);

      // Ensure global router is available for Navigation
      // Note: For nested routes, we rely on the parent Router setting globalThis.__lit_router_main
      this.navigator = new Navigation(this);
    }

    createRenderRoot() {
      return this;
    }

    render() {
      return this._routes.outlet();
    }
  };

  customElements.define(name, Class);

  return Class;
}
