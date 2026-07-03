import { Route } from "./Route";
import {
  RouterAcknowledgeEvent,
  RoutesAcknowledgeEvent,
  RoutesConnectedEvent,
} from "./RoutesEvents";

/**
 * @template T
 * @typedef {T extends BaseController ? T : never} RouteManager
 */
export class AbstractController {
  /**
   * @type {Set<RouteManager<BaseController>>}
   */
  _children = new Set();

  /**
   * @type {RouteManager<BaseController> | null}
   */
  _parentRoute = null;

  /**
   * @type {import("lit").LitElement}
   */
  _host;

  /**
   * @param {import("lit").ReactiveElement} host - The Lit element that owns this controller.
   * @param {Route[]} routes - Initial route configuration.
   */
  constructor(host, options = {}) {
    host.addController(this);
    this._host = host;
    this.options = options;
  }

  hostConnected() {
    const connectEvent = new RoutesConnectedEvent(this);
    this._host.dispatchEvent(connectEvent);
    this.__childRouteConnected(connectEvent);
  }

  hostDisconnected() {
    this.__childRouteDisconnected();
  }

  /**
   *
   * @param {RouteManager<BaseController>} child
   */
  childRouteConnected(child) {
    // No-op by default, but can be implemented by subclasses to react to child route connections.
  }

  /**
   *
   * @param {RouteManager<BaseController>} child
   */
  childRouteDisconnected(child) {
    // No-op by default, but can be implemented by subclasses to react to child route disconnections.
  }

  /**
   *
   * if after connection the _parentRoute is null, that means this is an instance of Router.
   * if _parentRoute is not null, then this is an instance of RoutesController and _parentRoute is the parent immediate ancestor.
   *
   * @param {RoutesConnectedEvent} event
   */
  __childRouteConnected(event) {
    if (this.__cancelDisconnection) {
      this.__cancelDisconnection();
      this.__cancelDisconnection = null;
    }

    const nextParentRoute = event.parentRoute;
    if (this._parentRoute === nextParentRoute) {
      return;
    }

    const oldParentRoute = this._parentRoute;
    this._parentRoute = nextParentRoute;

    // If we had a previous parent route, disconnect from it
    if (oldParentRoute) {
      if (oldParentRoute._children.delete(this)) {
        oldParentRoute.childRouteDisconnected(this);
      }
    }
  }

  __childRouteDisconnected() {
    let isCancelled = false;
    const parentRoute = this._parentRoute;

    this.__cancelDisconnection = () => {
      isCancelled = true;
    };

    queueMicrotask(() => {
      if (isCancelled) {
        return;
      }

      this.__cancelDisconnection = null;

      if (parentRoute) {
        if (this._parentRoute === parentRoute) {
          this._parentRoute = null;
        }

        if (parentRoute._children.delete(this)) {
          this._parentRoute = null;
          parentRoute.childRouteDisconnected(this);
        }
      }

      if (this._children.size === 0) {
        return;
      }

      const disconnectedChildren = [...this._children];
      this._children.clear();

      // Detach only immediate children from this node; descendants keep their internal links.
      for (const child of disconnectedChildren) {
        if (child._parentRoute === this) {
          child._parentRoute = null;
        }

        this.childRouteDisconnected(child);
      }
    });
  }

  getMainRouter() {
    const event = new RouterAcknowledgeEvent();
    this._host.dispatchEvent(event);

    return event.router;
  }

  /**
   *
   * @param {RoutesConnectedEvent} event
   */
  onChildConnected = (event) => {
    if (
      !(event instanceof RoutesConnectedEvent) ||
      !event.router ||
      event.router === this
    ) {
      return;
    }
    event.stopImmediatePropagation();
    event.parentRoute = this;

    if (this._children.has(event.router)) {
      return;
    }

    this._children.add(event.router);
    this.childRouteConnected(event.router);
  };

  /**
   *
   * @param {RoutesAcknowledgeEvent} event
   * @returns
   */
  onRouteAcknowledge = (event) => {
    if (
      !(event instanceof RoutesAcknowledgeEvent) ||
      event.target === this._host
    ) {
      return;
    }
    event.stopImmediatePropagation();
    event.preventDefault();

    event.current = this;
    event.parent = this._parentRoute;
  };
}
