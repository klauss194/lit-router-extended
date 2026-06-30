import { InvalidNavigationError } from "./errors/InvalidNavigationError.js";
import { Routes } from "./Routes.js";
import {
  RouterAcknowledgeEvent,
  RouterLocationChangedEvent,
  RouterLocationChangingEvent,
  RouterNavigationErrorEvent,
} from "./RoutesEvents.js";
import { collectParams } from "./util/collectParams.js";
import { log } from "./util/log.js";
import { shallowEqual } from "./util/shallow.js";
import { buildHref, locationToHref, parseUrl, resolveUrl } from "./util/url.js";

function dispatchLocationChanging({
  currentPathname,
  pathname,
  params,
  searchParams,
  hash,
  extraParams,
}) {
  window.dispatchEvent(
    new RouterLocationChangingEvent({
      currentPathname,
      pathname,
      params,
      extraParams,
      searchParams,
      hash,
    }),
  );
}

function dispatchLocationChanged({
  pathname,
  params,
  searchParams,
  hash,
  extraParams,
}) {
  window.dispatchEvent(
    new RouterLocationChangedEvent({
      pathname,
      params,
      extraParams,
      searchParams,
      hash,
    }),
  );
}

const CHANGE_LOCATION_SUBS = Symbol("change_location_subs");

/**
 * A root-level router that installs global event listeners to intercept
 * navigation.
 *
 * This class extends Routes so that it can also have a route configuration.
 *
 * There should only be one Router instance on a page, since the Router
 * installs global event listeners on `window` and `document`. Nested
 * routes should be configured with the `Routes` class.
 */
export class Router extends Routes {
  _isDestroyed = false;

  /** Current combined route params from the active route tree. */
  get params() {
    return collectParams(this).params;
  }

  /** Current extra parameters (non-URL state) from the active route tree. */
  get extraParams() {
    return collectParams(this).extraParams;
  }

  /** Current parsed search parameters from the active route tree. */
  get searchParams() {
    return collectParams(this).searchParams;
  }
  set searchParams(value) {
    this.replaceState({
      searchParams: value,
    });
  }

  /**
   * The current parsed route hash.
   */
  get hash() {
    return this.state.hash || "";
  }

  /**
   * @param {string}
   */
  set hash(value) {
    this.replaceState({
      hash: value.replace("#", ""),
    });
  }

  get pathname() {
    return this.state?.fullPathname || "/";
  }

  /**
   * Current full URL assembled from internal router state.
   * Consistent with params, searchParams, hash — all plain property reads.
   */
  get url() {
    return buildHref(this.state?.fullPathname, this.searchParams, this.hash);
  }
  /**
   * @param {import("lit").ReactiveControllerHost} host - The Lit element that owns this router.
   * @param {import("./Route.js").Route[]} [routes=[]] - Initial route configuration.
   *
   * @param {{ fallback?: boolean }} [options={}] - Optional configuration object (reserved for future use).
   */
  constructor(host, routes = [], options = {}) {
    super(host, routes, options);
    this[CHANGE_LOCATION_SUBS] = new Set();
  }

  /**
   * Called by Lit when the host element connects to the DOM.
   */
  hostConnected() {
    super.hostConnected();
    if (this._isDestroyed) {
      this._isDestroyed = false;
    }

    window.addEventListener("popstate", this._onPopState);
    window.addEventListener("click", this._onAnchorClick, { capture: true });
    window.addEventListener(
      RouterAcknowledgeEvent.eventName,
      this._onRouterAcknowledged,
      { capture: true },
    );

    const state = window.history.state;
    log("router", null, "host-connected", {
      url: locationToHref(window.location),
      "history-state": state ? "present" : null,
    });
    // Fire-and-forget — the kick-off completes asynchronously. The
    // navigation lifecycle is observable via the per-nav trace below.
    this.goto(locationToHref(window.location), {
      isBrowserNavigation: true,
      _cause: "initial",
      ...(state?.extraParams ? state.extraParams : {}),
    });
  }

  /**
   * Called by Lit when the host element disconnects from the DOM.
   */
  hostDisconnected() {
    super.hostDisconnected();
    this._isDestroyed = true;
    this[CHANGE_LOCATION_SUBS].clear();

    window.removeEventListener("popstate", this._onPopState);
    window.removeEventListener("click", this._onAnchorClick, { capture: true });
    window.removeEventListener(
      RouterAcknowledgeEvent.eventName,
      this._onRouterAcknowledged,
      { capture: true },
    );
  }

  /**
   * Navigates this routes controller to `pathname`.
   * Pure routing — does not touch window.location or history.
   * URL bar updates are handled by _onAnchorClick (pushState) and _onPopState.
   *
   * @param {string} pathname - The path to navigate to
   * @param {{ [extraParam:string]: string, searchParams?: URLSearchParams | Record<string, string>, hash?: string }} options
   */
  async goto(pathname, options = {}) {
    if (this._isDestroyed) {
      return;
    }

    const {
      isBrowserNavigation = false,
      hash,
      searchParams,
      _cause,
      ...extraParams
    } = options;
    const cause = _cause ?? "goto";

    pathname = pathname.trim();
    if (!pathname.startsWith("/")) {
      pathname = "/" + pathname;
    }

    const nextUrl = resolveUrl(this.state?.pathname || "/", pathname);
    const nextUrlHash = hash ?? nextUrl.hash;
    const mergedSearchParams = { ...searchParams, ...nextUrl.searchParams };

    // No-op guard — compare against internal state, not window.location
    if (
      this.pathname === nextUrl.pathname &&
      shallowEqual(this.state?.searchParams ?? {}, mergedSearchParams) &&
      this.state?.hash === nextUrlHash &&
      !isBrowserNavigation
    ) {
      log("router", null, "goto-noop", {
        path: nextUrl.pathname,
        cause,
      });
      return;
    }

    const prev = collectParams(this);
    prev.pathname = this.pathname;

    dispatchLocationChanging({
      currentPathname: prev.pathname,
      pathname: nextUrl.pathname,
      searchParams: mergedSearchParams,
      hash: nextUrlHash,
      extraParams,
      params: {},
    });

    log("router", null, "goto", {
      path: nextUrl.pathname,
      cause,
      skipLeave: isBrowserNavigation || undefined,
    });

    try {
      await this._gotoInternal(
        nextUrl.pathname,
        {
          extraParams,
          searchParams: mergedSearchParams,
          hash: nextUrlHash,
        },
        isBrowserNavigation,
        cause,
      );
    } catch (error) {
      if (
        error instanceof InvalidNavigationError &&
        ["navigation-aborted", "enter-callback", "leave-callback"].includes(
          error.metadata.reason,
        )
      ) {
        log("router", null, "goto-cancelled", {
          path: nextUrl.pathname,
          reason: error.metadata.reason,
        });
        return false;
      }

      throw error;
    }

    const context = collectParams(this);
    const next = {
      pathname: nextUrl.pathname,
      params: context.params,
      searchParams: context.searchParams,
      hash: context.hash,
    };

    dispatchLocationChanged({
      pathname: nextUrl.pathname,
      params: context.params,
      extraParams: context.extraParams,
      searchParams: context.searchParams,
      hash: context.hash,
    });

    this.__emitChanges({ eventName: "location-changed", prev, next });

    return true;
  }

  /**
   * Navigates to `pathname` and updates the browser URL bar.
   * This is the public navigation API — use this for user-facing navigation
   * where the URL bar should reflect the current route (e.g. link sharing).
   * Internally calls goto() after pushing to history.
   *
   * @param {string} pathname
   * @param {{ searchParams?: Record<string,string>, hash?: string, [extraParam:string]: any }} options
   */
  async navigate(pathname, options = {}) {
    if (this._isDestroyed) return;

    const nextUrl = resolveUrl(this.state?.pathname || "/", pathname);
    const nextHash = options.hash ?? nextUrl.hash ?? "";
    const nextSearch = { ...options.searchParams, ...nextUrl.searchParams };
    const href = buildHref(nextUrl.pathname, nextSearch, nextHash);

    if (href === locationToHref(window.location)) {
      log("router", null, "navigate-noop", {
        href,
        cause: options._cause ?? "navigate",
      });
      return;
    }

    // Capture navId before goto() so we can detect if a redirect fired
    // inside an enter guard during the navigation.
    //
    // How it works:
    //   goto() → _gotoInternal() increments _navId by exactly 1 per navigation.
    //   A redirect inside enter fires a second _gotoInternal → _navId += 2 total.
    //   navIdBefore + 1 ≠ this._navId → skip pushState → URL bar stays correct.
    //
    // Developer contract:
    //   If you call navigate() inside an enter guard to redirect, ALWAYS return
    //   false afterwards. The navId guard is a safety net for cases where the
    //   developer forgets, but explicit return false is the correct pattern:
    //
    //     enter: async () => {
    //       if (!auth.isLoggedIn) {
    //         this.router.navigate("/login");  // redirect
    //         return false;                    // required — exit the guard
    //       }
    //     }
    const navIdBefore = this._navId;
    const cause = options._cause ?? "navigate";
    log("router", null, "navigate", {
      path: nextUrl.pathname,
      cause,
    });
    const navigationCompleted = await this.goto(pathname, {
      ...options,
      _cause: cause,
    });

    if (!navigationCompleted || this._wasNavigationSuperseded(navIdBefore)) {
      log("router", null, "navigate-skip-pushstate", {
        path: nextUrl.pathname,
        completed: navigationCompleted ?? false,
        superseded: this._wasNavigationSuperseded(navIdBefore),
      });
      return;
    }

    log("router", null, "pushstate", { href });
    try {
      // NOTE (C4): We only store extraParams in history.state because
      // searchParams and hash are already encoded in the URL string (href).
      // On popstate, _onPopState reads them from window.location.href via
      // parseUrl() — the browser restores the full URL automatically.
      //
      // If we ever need searchParams/hash in history.state (e.g. for
      // server-side rendering or debugging), add them here:
      //   { extraParams, searchParams: nextSearch, hash: nextHash }
      window.history.pushState(
        { extraParams: options.extraParams ?? {} },
        "",
        href,
      );
    } catch (historyError) {
      throw new Error(`Failed to update browser URL: ${historyError}`);
    }
  }

  /**
   * Navigates one step backward in the browser session history.
   */
  goback() {
    history.back();
  }

  /**
   * Replaces the current history entry without triggering a full navigation.
   *
   * @param {{ searchParams?: Record<string,string> | URLSearchParams, extraParams?: Record<string,string>, hash?: string }} options
   */
  replaceState(options) {
    const searchParams = new URLSearchParams(
      options.searchParams ? options.searchParams : this.state.searchParams,
    );
    const hash = options.hash ? options.hash : this.state.hash;
    const extraParams = options.extraParams
      ? options.extraParams
      : this.state.extraParams;

    try {
      const prev = {
        pathname: this.state?.pathname ?? "/",
        params: this.params,
        searchParams: this.searchParams,
        hash: this.hash,
      };

      this.state = Object.assign({}, this.state, {
        hash,
        extraParams,
        searchParams: Object.fromEntries(searchParams.entries()),
      });

      window.history.replaceState(
        { extraParams },
        "",
        buildHref(
          this.state.pathname,
          Object.fromEntries(searchParams.entries()),
          hash,
        ),
      );

      const context = collectParams(this);
      const next = {
        pathname: this.state.pathname,
        params: context.params,
        searchParams: context.searchParams,
        hash,
      };

      dispatchLocationChanged({
        pathname: buildHref(
          this.state.pathname,
          Object.fromEntries(searchParams.entries()),
          hash,
        ),
        params: context.params,
        extraParams: context.extraParams,
        searchParams: context.searchParams,
        hash,
      });

      this.__emitChanges({ eventName: "location-changed", prev, next });
      this._host.requestUpdate();
    } catch (historyError) {
      throw new Error(`Failed to update browser URL: ${historyError}`);
    }
  }

  /**
   * Build a URL string for any given pathname, resolved against the current
   * router state. Use this when you need to construct a link to a different
   * route without navigating there.
   *
   * @param {string} pathname - Target path (absolute or relative)
   * @returns {string}
   */
  buildUrl(pathname) {
    const nextUrl = resolveUrl(this.state?.pathname || "/", pathname);
    return buildHref(nextUrl.pathname, nextUrl.searchParams, nextUrl.hash);
  }

  /**
   * Returns true if another navigation started after the one identified by
   * `token`, meaning the current navigation was superseded (e.g. a redirect
   * fired inside an enter guard).
   *
   * token is obtained by reading this._navId before calling goto().
   * Each _gotoInternal() call increments _navId by 1.
   * If _navId advanced by more than 1, a second navigation ran.
   *
   * @param {number} token - value of this._navId before goto() was called
   * @returns {boolean}
   */
  _wasNavigationSuperseded(token) {
    return this._navId !== token + 1;
  }

  getMainRouter() {
    return this;
  }

  /**
   *
   * @typedef {"location-changed" | "location-changing"} subEventTypes
   * @param {({ eventName: subEventTypes, prev: { pathname: string, params: object, searchParams: object, hash: string }, next: { pathname: string, params: object, searchParams: object, hash: string } }) => void} callback
   * @returns
   */
  subscribe(callback) {
    if (!callback || typeof callback !== "function") {
      throw new TypeError(
        "in Router.subscribe callback param must be a function",
      );
    }

    this[CHANGE_LOCATION_SUBS].add(callback);

    // Deliver current state immediately so late subscribers (Navigation
    // controllers that connect after the first navigation has already
    // committed) don't miss the initial route and have to wait for the
    // next navigation to get a valid state.
    //
    // This mirrors the behaviour of @lit/context ValueNotifier.addCallback
    // and RxJS BehaviorSubject — new subscribers always receive the latest
    // value at subscription time, not only future changes.
    //
    // eventName is "location-changed" because the route has already settled;
    // prev equals next because there is no "previous" from the subscriber's
    // perspective — it is seeing the state for the first time.
    if (this.state) {
      const context = collectParams(this);
      const currentState = {
        pathname: this.state.pathname ?? "/",
        params: context.params,
        searchParams: context.searchParams,
        hash: this.hash,
      };
      try {
        callback.call(this, {
          eventName: "location-changed",
          prev: currentState,
          next: currentState,
        });
      } catch {
        // swallow errors — a bad subscriber must not prevent registration
      }
    }

    return () => {
      this[CHANGE_LOCATION_SUBS].delete(callback);
    };
  }

  unsubscribe(callback) {
    return this[CHANGE_LOCATION_SUBS].delete(callback);
  }

  /**
   * Notifies all subscribers with the previous and next route state.
   * Consumers are responsible for diffing what they care about.
   *
   * @param {{ eventName: subEventTypes, prev: object, next: object }} param0
   */
  __emitChanges({ eventName, prev, next }) {
    for (const callback of this[CHANGE_LOCATION_SUBS]) {
      if (callback && typeof callback === "function") {
        try {
          callback.call(this, { eventName, prev, next });
        } catch {
          // swallow errors so a bad subscriber never breaks navigation
        }
      }
    }
  }

  /**
   * `popstate` event handler.
   * @param {PopStateEvent} e
   */
  _onPopState = async (e) => {
    if (this._isDestroyed) {
      return;
    }

    const extraParams = e.state ? (e.state.extraParams ?? {}) : {};

    const nextUrl = parseUrl(window.location.href);
    const prev = {
      pathname: this.state?.pathname ?? "/",
      params: this.params,
      searchParams: this.searchParams,
      hash: this.hash,
    };

    dispatchLocationChanging({
      currentPathname: locationToHref(window.location),
      pathname: nextUrl.pathname,
      params: prev.params,
      extraParams,
      searchParams: prev.searchParams,
      hash: prev.hash,
    });
    log("router", null, "popstate", { path: nextUrl.pathname });
    await this._gotoInternal(
      nextUrl.pathname,
      {
        extraParams,
        hash: nextUrl.hash,
        searchParams: nextUrl.searchParams,
      },
      true,
      "popstate",
    );

    const context = collectParams(this);
    const next = {
      pathname: nextUrl.pathname,
      params: context.params,
      searchParams: context.searchParams,
      hash: this.hash,
    };

    dispatchLocationChanged({
      pathname: nextUrl.pathname,
      params: context.params,
      extraParams,
      searchParams: context.searchParams,
      hash: this.hash,
    });

    this.__emitChanges({ eventName: "location-changed", prev, next });
  };

  /**
   * @param {MouseEvent} e
   */
  _onAnchorClick = async (e) => {
    if (e.defaultPrevented) {
      return;
    }

    /**
     * @type {HTMLAnchorElement | undefined}
     */
    const anchor = e.composedPath().find((el) => {
      return el instanceof HTMLElement && el.nodeName.toLowerCase() === "a";
    });

    if (
      !anchor ||
      !anchor.hasAttribute("href") ||
      e.button !== 0 ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      anchor.hasAttribute("download") ||
      anchor.hasAttribute("router-ignore") ||
      ["_blank", "_parent", "_top"].includes(
        anchor.target?.toLocaleLowerCase(),
      ) ||
      window.location.origin !== anchor.origin
    ) {
      return;
    }

    e.preventDefault();

    const href = anchor.getAttribute("href");
    if (!href) return;

    const nextUrl = parseUrl(href);

    try {
      await this.navigate(nextUrl.pathname, {
        hash: nextUrl.hash,
        searchParams: nextUrl.searchParams,
        _cause: "anchor-click",
      });
      window.scrollTo(0, 0);
    } catch (error) {
      if (error instanceof InvalidNavigationError) {
        return;
      }

      anchor?.dispatchEvent(
        new RouterNavigationErrorEvent({ url: href, error }),
      );

      // Re-throw for global error telemetry (Sentry, etc.)
      queueMicrotask(() => {
        throw error;
      });
    }
  };

  /**
   *
   * @param {RouterAcknowledgeEvent} e
   * @returns
   */
  _onRouterAcknowledged = (e) => {
    if (!(e instanceof RouterAcknowledgeEvent) || !(this instanceof Router)) {
      return;
    }

    e.stopImmediatePropagation();
    e.preventDefault();

    e.router = this;
  };
}
