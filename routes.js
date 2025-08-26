/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { ReactRouterScorer } from './scorer.js';

// Create a global instance of ReactRouterScorer
const routerScorer = new ReactRouterScorer();

// A cache of compiled routes created for PathRouteConfig.
// Rather than converting all given RoutConfigs to URLPatternRouteConfig, this
// lets us make `routes` mutable so users can add new PathRouteConfigs
// dynamically.
const patternCache = new WeakMap();

// Cache for sorted routes
const sortedRoutesCache = new WeakMap();

const isPatternConfig = (route) =>
    route.pattern !== undefined;

export const getPattern = (route) => {
    if (isPatternConfig(route)) {
        return route.pattern;
    }
    let pattern = patternCache.get(route);
    if (pattern === undefined) {
        // Use ReactRouterScorer to compile the route
        const compiled = routerScorer.compileRoute(route.path);
        const scoreData = routerScorer.scoreRoute(route.path);
        pattern = {
            ...compiled,
            score: scoreData.score,
            scoreBreakdown: scoreData.breakdown,
            specificity: scoreData.specificity,
            test: (input) => {
                const pathname = typeof input === 'string' ? input : input.pathname;
                return compiled.regex.test(pathname);
            },
            exec: (input) => {
                const pathname = typeof input === 'string' ? input : input.pathname;
                const matchResult = routerScorer.matchPathAdvanced(pathname, compiled);
                if (!matchResult) return null;
                
                return {
                    pathname: {
                        groups: matchResult.params,
                        input: pathname
                    }
                };
            }
        };
        patternCache.set(route, pattern);
    }
    return pattern;
};

/**
 * Returns the tail of a pathname groups object. This is the match from a
 * wildcard at the end of a pathname pattern, like `/foo/*`
 */
export const getTailGroup = (groups) => {
    let tailKey;
    for (const key of Object.keys(groups)) {
        if (/\d+/.test(key) && (tailKey === undefined || key > tailKey)) {
            tailKey = key;
        }
    }
    return tailKey && groups[tailKey];
};

/**
 * This event is fired from Routes controllers when their host is connected to
 * announce the child route and potentially connect to a parent routes controller.
 */
export class RoutesConnectedEvent extends Event {
    static eventName = 'lit-routes-connected';

    constructor(routes) {
        super(RoutesConnectedEvent.eventName, {
            bubbles: true,
            composed: true,
            cancelable: false,
        });
        this.routes = routes;
    }
}

/**
 * A reactive controller that performs location-based routing using a
 * configuration of URL patterns and associated render callbacks.
 */
export class Routes {
    // Track pending navigation to prevent race conditions
    _pendingNavigation = null;
    _navigationId = 0;

    /*
     * The currently installed set of routes in precedence order.
     *
     * This array is mutable. To dynamically add a new route you can write:
     *
     * ```js
     * this._routes.routes.push({
     *   path: '/foo',
     *   render: () => html`<p>Foo</p>`,
     * });
     * ```
     *
     * Mutating this property does not trigger any route transitions. If the
     * changes may result is a different route matching for the current path, you
     * must instigate a route update with `goto()`.
     */
    routes = [];

    /**
     * A default fallback route which will always be matched if none of the
     * {@link routes} match. Implicitly matches to the path "/*".
     */
    fallback = undefined;

    /*
     * The current set of child Routes controllers. These are connected via
     * the routes-connected event.
     */
    _childRoutes = [];

    _parentRoutes = undefined;

    /*
     * State related to the current matching route.
     *
     * We keep this so that consuming code can access current parameters, and so
     * that we can propagate tail matches to child routes if they are added after
     * navigation / matching.
     */
    _currentPathname = undefined;
    _currentRoute = undefined;
    _currentParams = {};
    _currentPassedParams = {};

    /**
     * Callback to call when this controller is disconnected.
     *
     * It's critical to call this immediately in hostDisconnected so that this
     * controller instance doesn't receive a tail match meant for another route.
     */
    _onDisconnect = undefined;

    constructor(host, routes, options) {
        (this._host = host).addController(this);
        this.routes = [...routes];
        this.fallback = options && options.fallback;
    }

    /**
     * Returns a URL string of the current route, including parent routes,
     * optionally replacing the local path with `pathname`.
     */
    link(pathname) {
        if (pathname && pathname.startsWith('/')) {
            return pathname;
        }
        if (pathname && pathname.startsWith('.')) {
            throw new Error('Not implemented');
        }
        pathname = pathname || this._currentPathname;
        return (this._parentRoutes && this._parentRoutes.link() || '') + pathname;
    }

    /**
     * Recursively check if all child routes can leave
     */
    async _checkChildrenCanLeave() {
        for (const childRoutes of this._childRoutes) {
            // Check the current child route's leave callback
            if (
                childRoutes._currentRoute &&
                typeof childRoutes._currentRoute.leave === 'function'
            ) {
                // Pass merged params to child's leave callback
                const childMergedParams = {...childRoutes._currentParams, ...childRoutes._currentPassedParams};
                const canChildLeave = await childRoutes._currentRoute.leave(childMergedParams);
                if (canChildLeave === false) {
                    return false;
                }
            }

            // Recursively check nested children
            const canNestedLeave = await childRoutes._checkChildrenCanLeave();
            if (!canNestedLeave) {
                return false;
            }
        }
        return true;
    }

    /**
     * Navigates this routes controller to `pathname`.
     *
     * This does not navigate parent routes, so it isn't (yet) a general page
     * navigation API. It does navigate child routes if pathname matches a
     * pattern with a tail wildcard pattern (`/*`).
     *
     * @param {string} pathname - The path to navigate to
     * @param {Object} params - Optional parameters to pass to the route
     */
    async goto(pathname, params = {}) {
        console.log('[ROUTER-002] goto called with pathname:', pathname, 'params:', params);
        console.log('[PARAM-TRACE] Routes.goto - pathname:', pathname, 'passed params:', params);
        console.log('[ROUTER] Current routes:', this.routes.map(r => r.path));
        return this._gotoInternal(pathname, false, params);
    }

    /**
     * Internal navigation method that can optionally skip leave callbacks for recovery
     */
    async _gotoInternal(pathname, skipLeaveCallbacks = false, params = {}) {
        // Wait for any pending navigation to complete to prevent race conditions
        if (this._pendingNavigation) {
            try {
                await this._pendingNavigation;
            } catch {
                // Ignore errors from previous navigation
            }
        }

        // Create a new navigation promise and track it
        const navigationId = ++this._navigationId;
        const navigationPromise = this._performNavigation(
            pathname,
            navigationId,
            skipLeaveCallbacks,
            params
        );
        this._pendingNavigation = navigationPromise;

        try {
            await navigationPromise;
        } finally {
            // Clear pending navigation if this was the latest one
            if (this._pendingNavigation === navigationPromise) {
                this._pendingNavigation = null;
            }
        }
    }

    /**
     * Recovery navigation that skips leave callbacks to prevent duplicate calls
     */
    async _gotoRecover(pathname) {
        return this._gotoInternal(pathname, true);
    }

    /**
     * Perform the actual navigation with proper error handling and state management
     */
    async _performNavigation(pathname, navigationId, skipLeaveCallbacks = false, passedParams = {}) {
        // Check if this navigation is still valid (not superseded by newer navigation)
        const isCurrentNavigation = () => this._navigationId === navigationId;

        // TODO (justinfagnani): handle absolute vs relative paths separately.
        // TODO (justinfagnani): do we need to detect when goto() is called while
        // a previous goto() call is still pending?

        // TODO (justinfagnani): generalize this to handle query params and
        // fragments. It currently only handles path names because it's easier to
        // completely disregard the origin for now. The click handler only does
        // an in-page navigation if the origin matches anyway.

        // Call leave callback on current route before navigation (unless this is recovery)
        if (
            !skipLeaveCallbacks &&
            this._currentRoute &&
            typeof this._currentRoute.leave === 'function'
        ) {
            // Pass merged params to leave callback
            const mergedParams = {...this._currentParams, ...this._currentPassedParams};
            const canLeave = await this._currentRoute.leave(mergedParams);
            // If leave() returns false, cancel this navigation
            if (canLeave === false) {
                return;
            }
        }

        // Check if navigation is still current after leave callback
        if (!isCurrentNavigation()) {
            return;
        }

        // Recursively call leave callbacks on child routes to ensure proper cleanup (unless this is recovery)
        if (!skipLeaveCallbacks) {
            const canLeaveChildren = await this._checkChildrenCanLeave();
            if (!canLeaveChildren) {
                return;
            }
        }

        // Check if navigation is still current after children leave callbacks
        if (!isCurrentNavigation()) {
            return;
        }

        let tailGroup;

        if (this.routes.length === 0 && this.fallback === undefined) {
            // If a routes controller has none of its own routes it acts like it has
            // one route of `/*` so that it passes the whole pathname as a tail
            // match.
            tailGroup = pathname;
            this._currentPathname = '';
            // Simulate a tail group with the whole pathname
            this._currentParams = {0: tailGroup};
            this._currentPassedParams = passedParams;
        } else {
            const route = this._getRoute(pathname);
            if (route === undefined) {
                throw new Error(`No route found for ${pathname}`);
            }
            const pattern = getPattern(route);
            const result = pattern.exec({pathname});
            const params = (result && result.pathname && result.pathname.groups) || {};
            tailGroup = getTailGroup(params);
            if (typeof route.enter === 'function') {
                // Pass merged params to enter callback
                const mergedParams = {...params, ...passedParams};
                const success = await route.enter(mergedParams);
                // If enter() returns false, cancel this navigation
                if (success === false) {
                    return;
                }
            }

            // Check if navigation is still current after enter callback
            if (!isCurrentNavigation()) {
                return;
            }

            // Only update route state if the enter handler completes successfully
            this._currentRoute = route;
            this._currentParams = params;
            this._currentPassedParams = passedParams;
            console.log('[PARAM-TRACE] _performNavigation - storing URL params:', params, 'passed params:', passedParams);
            this._currentPathname =
                tailGroup === undefined
                    ? pathname
                    : pathname.substring(0, pathname.length - tailGroup.length);
        }

        // Propagate the tail match to children
        if (tailGroup !== undefined) {
            for (const childRoutes of this._childRoutes) {
                childRoutes.goto(tailGroup, passedParams);
            }
        }

        // Check if navigation is still current before triggering update
        if (isCurrentNavigation()) {
            this._host.requestUpdate();

            // Dispatch navigation success event with full path
            const fullPath = this.link(); // Reconstructs full path including parent routes
            this._host.dispatchEvent(new CustomEvent('lit-router-location-changed', {
                detail: {
                    pathname: this._currentPathname, // Local pathname fragment
                    fullPath: fullPath, // Complete path for NavigationStateService
                    params: this._currentParams,
                    passedParams: this._currentPassedParams,
                    route: this._currentRoute
                },
                bubbles: true,
                composed: true
            }));

        }
    }

    /**
     * The result of calling the current route's render() callback.
     */
    outlet() {
        if (!this._currentRoute || !this._currentRoute.render) {
            return undefined;
        }
        
        // Merge URL params and passed params, with passed params taking precedence
        const mergedParams = {...this._currentParams, ...this._currentPassedParams};
        console.log('[PARAM-TRACE] outlet() - URL params:', this._currentParams, 'passed params:', this._currentPassedParams, 'merged:', mergedParams);
        return this._currentRoute.render(mergedParams);
    }

    /**
     * The current parsed route parameters.
     */
    get params() {
        return this._currentParams;
    }

    /**
     * Adds a new route to the router.
     * 
     * @param {Object} route - The route configuration object
     * @param {string} route.path - The path pattern for the route
     * @param {Function} route.render - The render function for the route
     * @param {Function} [route.enter] - Optional enter callback
     * @param {Function} [route.leave] - Optional leave callback
     * @param {number} [index] - Optional index to insert the route at (for precedence)
     * @returns {boolean} - True if route was added successfully
     */
    addRoute(route, index) {
        // Validate route
        if (!route || typeof route !== 'object') {
            console.error('[Router] Invalid route: route must be an object');
            return false;
        }
        
        if (!route.path || typeof route.path !== 'string') {
            console.error('[Router] Invalid route: missing or invalid path');
            return false;
        }
        
        if (!route.render || typeof route.render !== 'function') {
            console.error('[Router] Invalid route: missing or invalid render function');
            return false;
        }
        
        // Check if route with same path already exists
        const existingIndex = this.routes.findIndex(r => r.path === route.path);
        if (existingIndex !== -1) {
            console.warn(`[Router] Route with path "${route.path}" already exists at index ${existingIndex}`);
            return false;
        }
        
        // Lock route modifications during navigation
        if (this._pendingNavigation) {
            console.warn('[Router] Cannot modify routes during navigation. Deferring operation...');
            // Defer the operation until navigation completes
            this._pendingNavigation.then(() => {
                this.addRoute(route, index);
            }).catch(() => {
                // Still try to add even if navigation failed
                this.addRoute(route, index);
            });
            return false;
        }
        
        // Add route at specified index or at the end
        if (index !== undefined && index >= 0 && index <= this.routes.length) {
            this.routes.splice(index, 0, route);
        } else {
            this.routes.push(route);
        }
        
        console.log(`[Router] Route added: ${route.path}`);
        
        // Clear pattern cache for the new route
        patternCache.delete(route);
        
        // Clear sorted routes cache since routes have changed
        sortedRoutesCache.delete(this);
        
        // If the new route matches current pathname, trigger re-navigation
        if (this._currentPathname !== undefined) {
            const pattern = getPattern(route);
            if (pattern.test({ pathname: this._currentPathname })) {
                console.log(`[Router] New route matches current path, re-navigating...`);
                this.goto(this._currentPathname, this._currentPassedParams);
            }
        }
        
        return true;
    }

    /**
     * Removes a route from the router.
     * 
     * @param {string|Object} pathOrRoute - The path string or route object to remove
     * @returns {Object|null} - The removed route object or null if not found
     */
    removeRoute(pathOrRoute) {
        if (!pathOrRoute) {
            console.error('[Router] Invalid argument: pathOrRoute is required');
            return null;
        }
        
        // Lock route modifications during navigation
        if (this._pendingNavigation) {
            console.warn('[Router] Cannot modify routes during navigation. Deferring operation...');
            this._pendingNavigation.then(() => {
                this.removeRoute(pathOrRoute);
            }).catch(() => {
                // Still try to remove even if navigation failed
                this.removeRoute(pathOrRoute);
            });
            return null;
        }
        
        let index = -1;
        let removedRoute = null;
        
        if (typeof pathOrRoute === 'string') {
            // Remove by path
            index = this.routes.findIndex(r => r.path === pathOrRoute);
        } else if (typeof pathOrRoute === 'object') {
            // Remove by route object reference
            index = this.routes.indexOf(pathOrRoute);
        }
        
        if (index !== -1) {
            removedRoute = this.routes.splice(index, 1)[0];
            console.log(`[Router] Route removed: ${removedRoute.path}`);
            
            // Clear pattern cache
            patternCache.delete(removedRoute);
            
            // Clear sorted routes cache since routes have changed
            sortedRoutesCache.delete(this);
            
            // If removed route was the current route, navigate to fallback or throw error
            if (this._currentRoute === removedRoute) {
                console.warn('[Router] Removed current route, re-navigating...');
                if (this._currentPathname !== undefined) {
                    this.goto(this._currentPathname, this._currentPassedParams);
                }
            }
        } else {
            console.warn('[Router] Route not found for removal');
        }
        
        return removedRoute;
    }

    /**
     * Removes all routes from the router.
     * 
     * @param {boolean} [keepFallback=true] - Whether to keep the fallback route
     */
    clearRoutes(keepFallback = true) {
        // Lock route modifications during navigation
        if (this._pendingNavigation) {
            console.warn('[Router] Cannot modify routes during navigation. Deferring operation...');
            this._pendingNavigation.then(() => {
                this.clearRoutes(keepFallback);
            }).catch(() => {
                // Still try to clear even if navigation failed
                this.clearRoutes(keepFallback);
            });
            return;
        }
        
        // Clear pattern cache for all routes
        this.routes.forEach(route => patternCache.delete(route));
        
        // Clear sorted routes cache
        sortedRoutesCache.delete(this);
        
        // Clear routes array
        this.routes.length = 0;
        
        if (!keepFallback) {
            this.fallback = undefined;
        }
        
        console.log('[Router] All routes cleared');
        
        // Reset current route state
        this._currentRoute = undefined;
        
        // Try to re-navigate if we have a current pathname
        if (this._currentPathname !== undefined) {
            this.goto(this._currentPathname, this._currentPassedParams);
        }
    }

    /**
     * Gets a route by its path.
     * 
     * @param {string} path - The route path to find
     * @returns {Object|undefined} - The route object or undefined if not found
     */
    getRouteByPath(path) {
        return this.routes.find(r => r.path === path);
    }

    /**
     * Checks if a route exists for the given path.
     * 
     * @param {string} path - The route path to check
     * @returns {boolean} - True if route exists
     */
    hasRoute(path) {
        return this.routes.some(r => r.path === path);
    }

    /**
     * Updates an existing route's configuration.
     * 
     * @param {string} path - The path of the route to update
     * @param {Object} updates - Object containing properties to update
     * @returns {boolean} - True if route was updated successfully
     */
    updateRoute(path, updates) {
        const route = this.getRouteByPath(path);
        if (!route) {
            console.error(`[Router] Route not found: ${path}`);
            return false;
        }
        
        // Lock route modifications during navigation
        if (this._pendingNavigation) {
            console.warn('[Router] Cannot modify routes during navigation. Deferring operation...');
            this._pendingNavigation.then(() => {
                this.updateRoute(path, updates);
            }).catch(() => {
                // Still try to update even if navigation failed
                this.updateRoute(path, updates);
            });
            return false;
        }
        
        // Update route properties (except path)
        Object.keys(updates).forEach(key => {
            if (key !== 'path' && updates[key] !== undefined) {
                route[key] = updates[key];
            }
        });
        
        console.log(`[Router] Route updated: ${path}`);
        
        // If this is the current route and render function changed, re-render
        if (this._currentRoute === route && updates.render) {
            this._host.requestUpdate();
        }
        
        return true;
    }

    /**
     * Gets all current routes.
     * 
     * @returns {Array} - Copy of the routes array
     */
    getAllRoutes() {
        return [...this.routes];
    }

    /**
     * Matches `url` against the installed routes and returns the first match.
     * Routes are evaluated in score order (highest score first).
     */
    _getRoute(pathname) {
        // Get sorted routes
        const sortedRoutes = this._getSortedRoutes();
        
        console.log('[ROUTER] Looking for route for pathname:', pathname);
        console.log('[ROUTER] Testing against routes:', sortedRoutes.map(r => r.path));
        
        // Find first matching route in score order
        const matchedRoute = sortedRoutes.find((r) => {
            const pattern = getPattern(r);
            const matches = pattern.test({pathname: pathname});
            console.log(`[ROUTER] Testing ${pathname} against ${r.path}: ${matches}`);
            return matches;
        });
        
        console.log('[ROUTER] Matched route:', matchedRoute ? matchedRoute.path : 'none');
        
        if (matchedRoute || this.fallback === undefined) {
            return matchedRoute;
        }
        if (this.fallback) {
            // The fallback route behaves like it has a "/*" path. This is hidden from
            // the public API but is added here to return a valid RouteConfig.
            return {...this.fallback, path: '/*'};
        }
        return undefined;
    }

    /**
     * Get routes sorted by ReactRouterScorer score.
     * Uses caching to avoid re-sorting when routes haven't changed.
     */
    _getSortedRoutes() {
        // Check if we have a cached sorted version
        let cachedData = sortedRoutesCache.get(this);
        
        // If cache exists and routes haven't changed, return cached version
        if (cachedData && cachedData.routesSnapshot === this.routes) {
            return cachedData.sortedRoutes;
        }
        
        // Score and sort routes
        const scoredRoutes = this.routes.map(route => {
            const pattern = getPattern(route);
            return {
                ...route,
                _score: pattern.score,
                _scoreBreakdown: pattern.scoreBreakdown,
                _specificity: pattern.specificity
            };
        });
        
        // Sort by score (highest first)
        const sortedRoutes = [...scoredRoutes].sort((a, b) => {
            // Primary: Compare by total score
            const scoreDiff = b._score - a._score;
            if (scoreDiff !== 0) return scoreDiff;
            
            // Secondary: If scores equal, compare by specificity
            const specificityDiff = b._specificity - a._specificity;
            if (specificityDiff !== 0) return specificityDiff;
            
            // Tertiary: Maintain original order (first defined wins)
            const aIndex = this.routes.indexOf(a);
            const bIndex = this.routes.indexOf(b);
            return aIndex - bIndex;
        });
        
        // Cache the sorted routes
        sortedRoutesCache.set(this, {
            routesSnapshot: this.routes,
            sortedRoutes: sortedRoutes
        });
        
        return sortedRoutes;
    }

    hostConnected() {
        this._host.addEventListener(
            RoutesConnectedEvent.eventName,
            this._onRoutesConnected
        );
        const event = new RoutesConnectedEvent(this);
        this._host.dispatchEvent(event);
        this._onDisconnect = event.onDisconnect;
    }

    hostDisconnected() {
        // When this child routes controller is disconnected because a parent
        // outlet rendered a different template, disconnecting will ensure that
        // this controller doesn't receive a tail match meant for another route.
        if (this._onDisconnect) {
            this._onDisconnect();
        }
        this._parentRoutes = undefined;
        // Cancel any pending navigation
        this._pendingNavigation = null;
    }

    _onRoutesConnected = (e) => {
        // Don't handle the event fired by this routes controller, which we get
        // because we do this.dispatchEvent(...)
        if (e.routes === this) {
            return;
        }

        const childRoutes = e.routes;
        this._childRoutes.push(childRoutes);
        childRoutes._parentRoutes = this;

        e.stopImmediatePropagation();
        e.onDisconnect = () => {
            // Remove route from this._childRoutes:
            // `>>> 0` converts -1 to 2**32-1
            if (this._childRoutes) {
                this._childRoutes.splice(
                    this._childRoutes.indexOf(childRoutes) >>> 0,
                    1
                );
            }
        };

        const tailGroup = getTailGroup(this._currentParams);
        if (tailGroup !== undefined) {
            childRoutes.goto(tailGroup, this._currentPassedParams);
        }
    };
}
