import { LitElement, html } from "lit";
import { Router, Navigation } from "../../src/index.js";
import { RouterLocationChangedEvent } from "../../src/RoutesEvents.js";

/**
 *
 * @param {string} name
 * @param {{ name:string; path:string; render():html; enter():boolean | undefined; leave():boolean | undefined;}[]} routes
 *
 * @returns {Object} Class
 *
 * @example
 * ```js
 * const [element, factory] = appRouter("my-app", [
 *     {
 *         name: "home",
 *         path: "/",
 *         render: () => html`<h1>Home</h1>`,
 *     },
 *     {
 *         name: "about",
 *         path: "/about",
 *         render: () => html`<h1>About</h1>`,
 *     },
 *     {
 *         name: "section",
 *         path: "/section/:param",
 *         render: ({ params }) => html`<h1>About ${params.param}</h1>`,
 *     },
 *     {
 *         name: "allpath",
 *         path: "/:path*",
 *         render: () => html`<h1>All Path</h1>`,
 *     },
 * ]);
 * ```
 */
export default function appRouter(name, routes = []) {
  const Class = class AppRouter extends LitElement {
    _router;
    navigator;

    /** @type {Array<{action: string, pathname: string, browserUrl: string, params: object, searchParams: object, hash: string, _hasUndefined: boolean}>} */
    _navLog = [];

    _router = new Router(this, routes);

    constructor() {
      super();
      this.navigator = new Navigation(this);
    }

    createRenderRoot() {
      return this;
    }

    connectedCallback() {
      super.connectedCallback();

      window.addEventListener(
        RouterLocationChangedEvent.eventName,
        this._traceLocationChanged,
      );
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      window.removeEventListener(
        RouterLocationChangedEvent.eventName,
        this._traceLocationChanged,
      );
    }

    _traceLocationChanged = (e) => {
      const d = e.detail || {};
      const entry = {
        action: "location-changed",
        pathname: d.pathname,
        browserUrl:
          window.location.pathname +
          window.location.search +
          window.location.hash,
        params: d.params,
        searchParams: d.searchParams,
        hash: d.hash,
        extraParams: d.extraParams,
        _hasUndefined:
          d.params === undefined ||
          d.searchParams === undefined ||
          d.hash === undefined,
      };
      this._navLog.push(entry);
      console.log("[test-trace]", entry.action, {
        pathname: entry.pathname,
        browserUrl: entry.browserUrl,
        urlMatch: entry.pathname === entry.browserUrl,
        params: entry.params,
        searchParams: entry.searchParams,
        hash: entry.hash,
        hasUndefined: entry._hasUndefined,
      });
    };

    render() {
      return html`<main>${this._router.outlet()}</main>`;
    }
  };

  customElements.define(name, Class);

  return Class;
}
