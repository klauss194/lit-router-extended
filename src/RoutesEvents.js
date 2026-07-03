/**
 * This event is fired from Routes controllers when their host is connected to
 * announce the child route and potentially connect to a parent routes controller.
 *
 */

export class RoutesConnectedEvent extends Event {
  static eventName = "lit-routes-connected";

  constructor(router) {
    super(RoutesConnectedEvent.eventName, {
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    this.router = router;
    this.parentRoute = null;
  }
}

/**
 * This event is fired from StackRouters to find the previous RoutesController
 * in the router stack.
 */
export class RoutesAcknowledgeEvent extends Event {
  static eventName = "lit-routes-acknowledge";

  constructor() {
    super(RoutesAcknowledgeEvent.eventName, {
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    this.parent = undefined;
    this.current = undefined;
  }
}

export class RouterAcknowledgeEvent extends Event {
  static eventName = "lit-router-acknowledge";

  constructor() {
    super(RouterAcknowledgeEvent.eventName, {
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    this.router = null;
  }
}

export class RouterLocationChangingEvent extends CustomEvent {
  static eventName = "lit-router-location-changing";

  constructor({ currentPathname, pathname, extraParams, searchParams, hash }) {
    super(RouterLocationChangingEvent.eventName, {
      detail: { currentPathname, pathname, extraParams, searchParams, hash },
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    this.pathname = pathname;
  }
}

export class RouterLocationChangedEvent extends CustomEvent {
  static eventName = "lit-router-location-changed";

  constructor({ pathname, params, searchParams, hash, extraParams }) {
    super(RouterLocationChangedEvent.eventName, {
      detail: { pathname, params, extraParams, searchParams, hash },
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    this.pathname = pathname;
  }
}

export class RouterNavigationErrorEvent extends CustomEvent {
  static eventName = "lit-router-error";
  constructor({ url, error }) {
    super(RouterNavigationErrorEvent.eventName, {
      detail: { url, error },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
  }

  get error() {
    return this.detail.error;
  }

  get url() {
    return this.detail.url;
  }
}
