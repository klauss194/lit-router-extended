import { html } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { AbstractController } from "./AbstractController.js";
import { InvalidNavigationError, RouteNotFoundError } from "./errors/index.js";
import { RoutesSet } from "./RoutesSet.js";
import { diff, log } from "./util/log.js";
import { shallowEqual } from "./util/shallow.js";
import { joinPaths } from "./util/url.js";

import "./contrib/lit-outlet.js";
import { Route } from "./Route.js";

/**
 * Sentinel Route used by passthrough routers (no routes, no fallback).
 * Its "/*" path ensures _propagateNavigation forwards the full pathname
 * to any registered child routers.
 */
const PASSTHROUGH_ROUTE = new Route({ path: "/*" });
const NAVIGATION_ABORTED_TOKEN = "navigation-aborted";

export class Routes extends AbstractController {
  router = null;

  /**
   * @type {import("./Route").Route}
   */
  currentRoute;

  routes = new RoutesSet();

  state = {
    pathname: "",
    tailGroup: "",
    hasTail: false,
    fullPathname: "",
    searchParams: {},
    extraParams: {},
    params: {},
    hash: "",
  };

  _outlet = createRef();

  _currentAbort = null;
  _navId = 0;

  /**
   * @param {import("lit").ReactiveElement} host - The Lit element that owns this controller.
   * @param {Array<Route|import("./Route").RouteConfig>} routes - Initial route configuration.
   */
  constructor(host, routes = [], options = {}) {
    super(host, options);

    for (const route of routes) {
      this.routes.add(route instanceof Route ? route : new Route(route));
    }
  }

  /** Short tag used in trace logs. */
  get _tag() {
    return `routes:${this._host.nodeName}`;
  }

  hostConnected() {
    super.hostConnected();

    // Cancel a pending disconnect-abort (e.g. ion-modal moved us to a
    // portal — disconnect/connect fire in the same call stack and we
    // shouldn't kill the in-flight nav).
    if (this.__cancelDisconnectAbort) {
      this.__cancelDisconnectAbort();
      this.__cancelDisconnectAbort = null;
    }

    this.routes.options.fallbackRoute = this.options.fallback
      ? PASSTHROUGH_ROUTE
      : null;

    this.router = this.getMainRouter();
    if (!this.router) {
      throw new Error("No router found for Routes component");
    }
  }

  hostDisconnected() {
    super.hostDisconnected();

    // Defer the abort by a microtask. If hostConnected fires before the
    // microtask runs (move-to-portal), the abort is cancelled. If we don't
    // come back, the abort fires and the in-flight nav unwinds normally.
    if (this._currentAbort) {
      const ac = this._currentAbort;
      log(this._tag, ac.navId, "host-disconnected-pending-abort", {
        cause: ac.cause,
      });

      let cancelled = false;
      this.__cancelDisconnectAbort = () => {
        cancelled = true;
        log(this._tag, ac.navId, "host-reconnected-abort-cancelled", {
          cause: ac.cause,
        });
      };

      queueMicrotask(() => {
        if (cancelled) return;
        log(this._tag, ac.navId, "host-disconnected-abort", {
          cause: ac.cause,
        });
        ac.abort(NAVIGATION_ABORTED_TOKEN);
        if (this._currentAbort === ac) {
          this._currentAbort = null;
        }
      });
    }
  }

  /**
   * Called when a child Routes controller is registered. Bootstraps the child
   * with the current tailGroup so it can render before the parent's natural
   * `_propagateNavigation` runs.
   *
   * @param {Routes} child
   */
  async childRouteConnected(child) {
    try {
      const state = {
        extraParams: this.state.extraParams,
        searchParams: this.state.searchParams,
        hash: this.state.hash,
      };

      const pathname = this.state.tailGroup;
      log(this._tag, this._currentAbort?.navId, "child-connected", {
        child: child._host.nodeName,
        path: pathname,
      });
      await child._gotoInternal(pathname, state, false, "child-connected");
    } catch (error) {
      if (
        error instanceof InvalidNavigationError &&
        ["navigation-aborted", "enter-callback", "leave-callback"].includes(
          error.metadata.reason,
        )
      ) {
        log(this._tag, null, "child-connected-cancelled", {
          child: child._host.nodeName,
          reason: error.metadata.reason,
        });
        return;
      }

      throw error;
    }
  }

  /**
   * @param {string} pathname
   * @param {Omit<import('./Route.js').RouteContext, 'signal' | 'params'> & { params?: object}} options
   * @param {boolean} skipLeaveCallbacks
   * @param {string} cause - one of "initial", "anchor-click", "popstate",
   *   "navigate", "goto", "child-connected", "propagate", "unknown"
   *
   * @returns {Promise<void>}
   *
   * @throws {InvalidNavigationError} if navigation is invalid (e.g. no matching route, navigation cancelled by leave callback, etc.)
   */
  async _gotoInternal(
    pathname,
    options = {},
    skipLeaveCallbacks = false,
    cause = "unknown",
  ) {
    const ac = new AbortController();
    const myId = ++this._navId;
    ac.navId = myId;
    ac.cause = cause;

    const prev = this._currentAbort;
    if (prev) {
      log(this._tag, myId, "abort", {
        victim: `nav#${prev.navId}`,
        "victim-cause": prev.cause,
        cause,
      });
      prev.abort(NAVIGATION_ABORTED_TOKEN);
    }
    this._currentAbort = ac;

    log(this._tag, myId, "start", {
      cause,
      path: pathname,
      skipLeave: skipLeaveCallbacks || undefined,
      parent: this._parentRoute?._host?.nodeName,
    });

    let threw;
    try {
      await this._navigate(pathname, options, skipLeaveCallbacks, ac);
    } catch (error) {
      threw = error;
      throw error;
    } finally {
      const status = threw
        ? threw instanceof InvalidNavigationError
          ? `cancelled:${threw.metadata?.reason ?? "unknown"}`
          : `error:${threw.name ?? "Error"}`
        : "ok";
      const superseded = myId !== this._navId;
      log(this._tag, myId, superseded ? "done-superseded" : "done", {
        path: pathname,
        status,
        "current-nav": superseded ? this._navId : undefined,
      });
      if (!superseded) {
        this._currentAbort = null;
      }
    }
  }

  /**
   * @param {string} pathname
   * @param {Omit<import('./Route.js').RouteContext, 'signal' | 'params'> & { params?: object}} options
   * @param {boolean} skipLeaveCallbacks
   * @param {AbortController} abortController
   * @returns {Promise<void>}
   *
   * @throws {InvalidNavigationError} if navigation is invalid (e.g. no matching route, navigation cancelled by leave callback, etc.)
   */
  async _navigate(pathname, options = {}, skipLeaveCallbacks, abortController) {
    const navId = abortController.navId;

    /**
     * @throws {InvalidNavigationError} if signal is aborted
     * @returns {void}
     */
    const checkSignal = (where) => {
      if (abortController?.signal.aborted) {
        log(this._tag, navId, "aborted", {
          where,
          path: pathname,
          reason: abortController?.signal.reason,
        });
        throw new InvalidNavigationError(
          `Navigation aborted while navigating to ${pathname} in ${this._host.nodeName}`,
          {
            reason: NAVIGATION_ABORTED_TOKEN,
          },
        );
      }
    };

    if (this.routes.size === 0) {
      if (!this.options.fallback) {
        throw new InvalidNavigationError(
          "No routes defined and no fallback provided",
          {
            pathname,
            reason: "no-routes",
          },
        );
      }

      this.currentRoute = PASSTHROUGH_ROUTE;
      log(this._tag, navId, "passthrough-fallback", { path: pathname });
      this._host.requestUpdate();

      return;
    }
    /**
     * @type {import("./Route").Route}
     */
    const nextRoute = this.routes.matchRoute(pathname);
    if (!nextRoute) {
      // Force component unmount
      const previousRoute = this.currentRoute;
      const previousPathname = previousRoute?.pathname;

      this.currentRoute = undefined;
      log(this._tag, navId, "no-match", { path: pathname });
      this._host.requestUpdate();

      throw new RouteNotFoundError(`Route not found for ${pathname}`, {
        currentRoute: previousRoute,
        currentPathname: previousPathname,
        targetPath: pathname,
      });
    }

    const parsedRouteParams = nextRoute.parsePathname(pathname);
    const sameParams = shallowEqual(
      this.state.params,
      parsedRouteParams.params,
    );
    log(this._tag, navId, "match", {
      route: nextRoute.path,
      params: parsedRouteParams.params,
      tail: parsedRouteParams.tailGroup,
    });

    if (
      nextRoute === this.currentRoute &&
      this.currentRoute.path === nextRoute.path &&
      sameParams
    ) {
      // Is this level just a passthrough to a child route?
      // If so, preserve this level's own searchParams/hash — they belong
      // to the page rendered here, not to the child being navigated to.
      log(this._tag, navId, "fast-path", {
        route: nextRoute.path,
        "enter-skipped": true,
      });

      const prevState = this.state;
      this.state = {
        hash: options.hash,
        searchParams: options.searchParams,
        extraParams: options.extraParams,
        pathname: parsedRouteParams.pathname,
        params: parsedRouteParams.params,
        tailGroup: parsedRouteParams.tailGroup,
        hasTail: parsedRouteParams.hasTail,
        fullPathname: parsedRouteParams.fullPathname,
      };

      const stateDiff = diff(prevState, this.state);
      if (stateDiff) {
        log(this._tag, navId, "commit", { state: stateDiff });
      }

      await this._propagateNavigation(
        parsedRouteParams.tailGroup,
        {
          extraParams: options.extraParams,
          searchParams: options.searchParams,
          hash: options.hash,
          abortController,
        },
        this._children,
      );

      log(this._tag, navId, "request-update", { reason: "fast-path-commit" });
      return this._host.requestUpdate();
    }

    checkSignal("pre-leave");

    if (!skipLeaveCallbacks) {
      log(this._tag, navId, "leave-start");
      const canLeave = await canDeeplyLeave(
        this,
        this.router,
        abortController.signal,
      );
      log(this._tag, navId, "leave-end", { canLeave });

      checkSignal("post-leave");

      if (canLeave === false) {
        throw new InvalidNavigationError(
          "Navigation cancelled by leave callback",
          {
            pathname,
            reason: "leave-callback",
          },
        );
      }
    }

    checkSignal("pre-enter");

    if (typeof nextRoute.enter === "function") {
      log(this._tag, navId, "enter-start", { route: nextRoute.path });
      const canEnter = await nextRoute.enter.call(this, {
        params: parsedRouteParams.params,
        extraParams: options.extraParams,
        searchParams: options.searchParams,
        hash: options.hash,
        route: nextRoute,
        signal: abortController.signal,
        pathname: pathname,
      });
      log(this._tag, navId, "enter-end", {
        route: nextRoute.path,
        canEnter,
      });

      checkSignal("post-enter");

      if (canEnter === false) {
        throw new InvalidNavigationError(
          "Navigation cancelled by enter callback",
          {
            pathname,
            reason: "enter-callback",
          },
        );
      }
    }

    checkSignal("pre-commit");

    this.currentRoute = nextRoute;
    const prevState = this.state;
    this.state = {
      hash: options.hash,
      searchParams: options.searchParams,
      extraParams: options.extraParams,
      pathname: parsedRouteParams.pathname,
      params: parsedRouteParams.params,
      tailGroup: parsedRouteParams.tailGroup,
      hasTail: parsedRouteParams.hasTail,
      fullPathname: parsedRouteParams.fullPathname,
    };

    const stateDiff = diff(prevState, this.state);
    log(this._tag, navId, "commit", {
      route: nextRoute.path,
      state: stateDiff || "{}",
    });

    log(this._tag, navId, "request-update", { reason: "commit" });
    this._host.requestUpdate();

    // [CHALLENGE-1] Removed await updateComplete + _propagateNavigation from
    // the new-route path. childRouteConnected() delivers tailGroup to every
    // child the moment it mounts, whether the child is a lazy chunk (connects
    // after the render) or an eager import (connects during the render).
    // PATH B (_propagateNavigation) was redundant here and caused:
    //   • double-fire aborts for eager children (PATH A aborted by PATH B)
    //   • a wasted full render-cycle await for lazy children (children=0 always)
    // _propagateNavigation is still called in the fast-path block above because
    // the same-route case never re-renders, so childRouteConnected never fires.
    //
    // log(this._tag, navId, "await-update");
    // await this._host.updateComplete;
    //
    // const childrens = Array.from(this._children);
    // log(this._tag, navId, "update-resolved", {
    //   children: childrens.length,
    // });
    //
    // await this._propagateNavigation(
    //   parsedRouteParams.tailGroup,
    //   {
    //     extraParams: options.extraParams,
    //     searchParams: options.searchParams,
    //     hash: options.hash,
    //     abortController,
    //   },
    //   childrens,
    // );
  }

  /**
   *
   * @param {string} pathname
   * @param {Omit<import('./Route.js').RouteContext, 'params' | 'signal'> & { abortController: AbortController }} options
   * @param {ArrayLike<Routes>} children
   *
   * @returns {Promise<void>}
   */
  async _propagateNavigation(pathname, options, children) {
    const { abortController, ...context } = options;
    const navId = abortController?.navId;
    /**
     * @type {Array<Routes>}
     */
    const childArray = Array.from(children);
    if (childArray.length === 0) {
      return;
    }
    if (abortController?.signal.aborted === true) {
      log(this._tag, navId, "propagate-skipped", {
        reason: "parent-aborted",
        path: pathname,
      });
      return;
    }

    log(this._tag, navId, "propagate", {
      path: pathname,
      children: childArray.map((c) => c._host.nodeName),
    });

    await Promise.all(
      childArray.map(async (child) => {
        return child._gotoInternal(pathname, context, false, "propagate");
      }),
    );
  }

  link() {
    if (!this.currentRoute) {
      return "";
    }

    const parentPathname = this._parentRoute?.link() || "";
    const currentPathname = this.state?.pathname;
    return joinPaths(parentPathname, currentPathname);
  }

  outlet() {
    let template = undefined;
    if (this.currentRoute?.render !== undefined && this.router) {
      const { params, extraParams, searchParams, hash } = this.router;
      template = this.currentRoute.render.call(this.router, {
        params,
        extraParams,
        searchParams,
        hash,
        route: this.currentRoute,
      });
    }

    log(this._tag, this._currentAbort?.navId, "outlet-render", {
      route: this.currentRoute?.path,
    });

    return html`
    <lit-router-outlet
    ${ref(this._outlet)}
    style="height: inherit;"
    @lit-routes-acknowledge=${this.onRouteAcknowledge}
    @lit-routes-connected=${this.onChildConnected}>
      ${template}
    </lit-router-outlet>`;
  }
}

/**
 *
 * @param {Routes} instance
 * @param {import("./Router").Router} router
 * @param {AbortSignal} signal
 *
 * @returns {Promise<boolean>} whether navigation can proceed (i.e. no leave callback returned false or aborted)
 */
async function canDeeplyLeave(instance, router, signal) {
  if (signal?.aborted === true) {
    return true;
  }

  if (typeof instance.currentRoute?.leave === "function") {
    const { params, extraParams, searchParams, hash } = router;
    const canNotLeave = await instance.currentRoute?.leave.call(router, {
      params,
      extraParams,
      searchParams,
      hash,
      signal,
    });

    if (signal?.aborted === true) {
      return true;
    }

    if (canNotLeave === false) {
      return false;
    }
  }

  for (const child of instance._children) {
    if (!(await canDeeplyLeave(child, router, signal))) {
      return false;
    }
  }

  return true;
}
