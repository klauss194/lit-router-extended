import { Routes } from "./Routes.js";
import {
  RouterAcknowledgeEvent,
  RoutesAcknowledgeEvent,
} from "./RoutesEvents.js";
import { InvalidNavigationError } from "./errors/index.js";
import { resolveUrl } from "./util/url.js";

/**
 * A lightweight navigation helper implemented as a Lit Reactive Controller.
 * It discovers the nearest active RoutesController via a custom acknowledgement
 * event and proxies high-level navigation operations to the root Router.
 *
 *
 * @fires lit-routes-acknowledgement - Fired when host is connected to discover parent routes.
 * @fires lit-router-acknowledgement - Fired when host is connected to discover app router.
 */
export class Navigation {
  /**
   * @type {import('./Router.js').Router}
   */
  #router;

  /**
   * @type {import('lit').LitElement }
   */
  __host;

  /**
   * @type {Routes | null}
   */
  #current = null;

  /**
   * @type {Routes | null}
   */
  #parent = null;

  /** Name of the currently matched route in this scope. */
  get routeName() {
    return this.#current?.currentRoute?.name;
  }

  /** The root Router instance. */
  get router() {
    return this.#router;
  }

  /** Current full URL. */
  get url() {
    return this.#router.url;
  }

  /** Current combined route params from the active router tree. */
  get params() {
    return this.#router?.params ?? {};
  }

  /** Current query/search parameters. */
  get searchParams() {
    return this.#router?.searchParams ?? {};
  }

  /** Replace current search params without changing path. */
  set searchParams(value) {
    if (this.#router) this.#router.searchParams = value;
  }

  /** Current hash (without leading #). */
  get hash() {
    return this.#router?.hash ?? "";
  }

  /** Update hash without changing path. */
  set hash(value) {
    if (this.#router) this.#router.hash = value;
  }

  /** Current extra parameters (non-URL state). */
  get extraParams() {
    return this.#router?.extraParams ?? {};
  }

  /** Current pathname from the router state. */
  get pathname() {
    return this.#router?.pathname ?? "";
  }

  /**
   * The name of the DOM event fired on the host element when navigation state changes.
   * Components listen to this to decide when to re-render.
   *
   * @example
   * this.addEventListener(Navigation.event, ({ detail: { prev, next } }) => {
   *   if (next.params.orderId !== prev.params.orderId) {
   *     this.requestUpdate();
   *   }
   * });
   */
  static event = "navigation";

  /**
   * Create a new Navigation controller and register it on the host.
   * @param {import('lit').ReactiveControllerHost} host - Lit host (e.g., a LitElement)
   */
  constructor(host) {
    host.addController(this);
    this.__host = host;
  }

  /**
   * Reactive Controller lifecycle hook: resolves the current and parent routes
   * by dispatching a `RoutesAcknowledgeEvent` and reading its payload.
   * Called automatically by the host when connected.
   */
  hostConnected() {
    const routerAck = new RouterAcknowledgeEvent();
    this.__host.dispatchEvent(routerAck);

    if (!routerAck.router) {
      throw new InvalidNavigationError(
        "No router found in the scope of Navigation controller. Make sure to have a global router or a parent RoutesController.",
        {
          operation: RouterAcknowledgeEvent.eventName,
          reason: "No router found in event acknowledgement",
        },
      );
    }
    this.#router = routerAck.router;

    this.__unsubscribe = this.#router.subscribe(({ eventName, prev, next }) => {
      if (eventName !== "location-changed") return;

      this.__host.dispatchEvent(
        new CustomEvent(Navigation.event, {
          detail: { prev, next },
          bubbles: false,
          composed: false,
        }),
      );
    });

    const scopeAck = new RoutesAcknowledgeEvent();
    this.__host.dispatchEvent(scopeAck);

    if (scopeAck.current && scopeAck.current instanceof Routes) {
      this.#current = scopeAck.current;
      this.#parent = scopeAck.parent;
    }

    if (!this.#current) {
      this.#current = this.#router;
      this.#parent = null;
    }
  }

  hostDisconnected() {
    if (this.__unsubscribe) {
      this.__unsubscribe();
      this.__unsubscribe = null;
    }
  }

  /**
   * Navigate to an absolute application pathname.
   * @param {string} pathname - Absolute app path (may include `?` and `#`)
   * @param {{
   *   [extraParams: string]: any,
   *   searchParams?: URLSearchParams | Record<string, string>,
   *   hash?: string,
   * }} [options] - Extra params forwarded to the router
   *
   * @returns {Promise<void>}
   */
  navigate(pathname, options) {
    return this.#router.navigate(pathname, options);
  }

  /**
   * Go back using the browser history (equivalent to `history.back()`).
   * @returns {void}
   */
  goback() {
    this.#router.goback();
  }

  /**
   * Push a child route relative to the current route.
   * Saves the current context (searchParams & hash) into extraParams
   * to allow restoration upon popping.
   *
   * @param {string} pathname - Relative path starting with `./` or `../`
   * @param {{
   *   preserveSearchParams?: boolean,
   *   searchParams?: URLSearchParams | Record<string, string>,
   *   hash?: string,
   *   [key: string]: any
   * }} [options] - Configuration options. Any extra props are passed to history state.
   */
  async push(
    pathname,
    {
      preserveSearchParams = false,
      searchParams = {},
      hash = "",
      ...extraParams
    } = {},
  ) {
    if (this.#current._children.size === 0) {
      throw new InvalidNavigationError(
        "This Route has no child routes to push to",
        {
          operation: "push",
          currentRoute: this.#current.currentRoute,
        },
      );
    }
    if (!this.#current.currentRoute?.path.endsWith("*")) {
      throw new InvalidNavigationError(
        "This Route cannot push to a child route, wildcard token (*) is required in the route path",
        {
          operation: "push",
          currentRoute: this.#current.currentRoute,
          reason: "Current route mapping does not end in a wildcard (*)",
        },
      );
    }

    let finalSearchParams = {};
    if (preserveSearchParams) {
      finalSearchParams = structuredClone(this.#router.searchParams);
    }
    finalSearchParams = Object.assign({}, finalSearchParams, searchParams);

    const currentExtraParams = Object.assign(
      {},
      this.#current.state.extraParams,
      extraParams,
    );
    const nextPathname = this.link(pathname);

    await this.#router.navigate(nextPathname, {
      ...currentExtraParams,
      searchParams: finalSearchParams,
      hash,
    });
  }

  /**
   * Pop the current child route.
   * Navigates to the parent route, optionally preserving search params.
   *
   * @param {{
   *   preserveSearchParams?: boolean,
   *   searchParams?: URLSearchParams | Record<string, string>,
   *   hash?: string,
   * }} [options] - Configuration options
   */
  async pop({ preserveSearchParams = false, searchParams, hash } = {}) {
    // When searchParams/hash are not provided (undefined), the router will
    // preserve existing state automatically. When explicitly provided, those
    // values are forwarded as-is.
    let finalSearchParams = searchParams;
    let finalHash = hash;

    if (preserveSearchParams) {
      finalSearchParams = {
        ...this.#router.searchParams,
        ...(searchParams ?? {}),
      };
    }

    // Navigation
    const hasTail = this.#current.state?.hasTail;

    if (hasTail && this.#current.state?.tailGroup !== "/") {
      const currentPath = this.#current.link();
      const currentExtraParams = this.#current.state?.extraParams || {};
      await this.#router.navigate(currentPath, {
        ...currentExtraParams,
        searchParams: finalSearchParams,
        hash: finalHash,
      });

      return;
    }

    if (!this.#parent || this.#current === this.#router) {
      return;
    }

    const parentPath = this.#parent.link();
    const parentExtraParams = this.#parent.state?.extraParams || {};
    await this.#router.navigate(parentPath, {
      ...parentExtraParams,
      searchParams: finalSearchParams,
      hash: finalHash,
    });
  }

  /**
   * Determine whether the current route group has focus (i.e., has children
   * but no active tail group).
   * @returns {boolean}
   */
  hasFocus() {
    const hasChildren =
      this.#current._children.size > 0 || this.#current.state?.hasTail;

    return  (!!this.#current.state?.hasTail && hasChildren) || !hasChildren;
  }

  /**
   * Build a link relative to the current route.
   * @param {string} [pathname=""] - Relative child path starting with `./` when provided
   *
   * @returns {string} Fully qualified in-app path
   * @throws {InvalidNavigationError} When providing a non-relative child path while children exist
   */
  link(pathname = "") {
    if (
      pathname &&
      this.#current._children.size > 0 &&
      !pathname.startsWith("./")
    ) {
      throw new InvalidNavigationError(
        "Pathname should be relative to the current route",
        {
          operation: "link",
          pathname,
        },
      );
    }

    return resolveUrl(this.#current?.link() || "/", pathname).pathname;
  }
}
