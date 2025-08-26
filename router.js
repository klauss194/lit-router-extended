/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Routes} from './routes.js';

// We cache the origin since it can't change
const origin = location.origin || location.protocol + '//' + location.host;

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

    hostConnected() {
        super.hostConnected();
        if (this._isDestroyed) {
            this._isDestroyed = false;
        }
        window.addEventListener('click', this._onClick);
        window.addEventListener('popstate', this._onPopState);
        // Kick off routed rendering by going to the current URL
        console.log('[ROUTER-001] Router connected, navigating to:', window.location.pathname);
        this._safeNavigate(() => this.goto(window.location.pathname));
    }

    hostDisconnected() {
        super.hostDisconnected();
        this._isDestroyed = true;
        window.removeEventListener('click', this._onClick);
        window.removeEventListener('popstate', this._onPopState);
    }

    /**
     * Safely execute navigation with proper error handling and cleanup
     */
    async _safeNavigate(navigationFn) {
        try {
            await navigationFn();
        } catch (error) {
            // Log error but don't throw to prevent breaking the app
            console.error('Router navigation failed:', error);
            // Try to recover by calling recovery navigation that skips leave callbacks
            try {
                console.log("ROUTER RECOVERY")
                await this._gotoRecover(window.location.pathname);
            } catch (recoveryError) {
                console.error('Recovery navigation also failed:', recoveryError);
            }
        }
    }

    /**
     * Navigates this router to `pathname` and updates the browser URL.
     *
     * This overrides the Routes.goto() method to also update the browser's
     * URL bar when navigating programmatically. It properly coordinates
     * leave callbacks to ensure URL updates only happen if navigation succeeds.
     *
     * @param {string} pathname - The path to navigate to
     * @param {Object} params - Optional parameters to pass to the route
     */
    async goto(pathname, params = {}) {
        // Prevent navigation if router is destroyed
        if (this._isDestroyed) {
            return;
        }

        // Normalize pathname
        pathname = pathname || '/';

        // Store the original pathname in case we need to revert
        const originalPathname = window.location.pathname;
        const originalSearch = window.location.search;
        const originalHash = window.location.hash;
        const originalUrl = originalPathname + originalSearch + originalHash;

        let urlWasUpdated = false;

        try {
            // Validate pathname
            if (typeof pathname !== 'string' || pathname === '') {
                throw new Error(
                    'Invalid pathname: pathname must be a non-empty string'
                );
            }

            // First call parent implementation to handle routing logic and leave callbacks
            // This will call leave callbacks and potentially block navigation
            await super.goto(pathname, params);

            // Only update browser URL after leave callbacks have approved and navigation succeeded
            if (pathname !== originalPathname) {
                try {
                    window.history.pushState({}, '', pathname);
                    urlWasUpdated = true;
                } catch (historyError) {
                    throw new Error(`Failed to update browser URL: ${historyError}`);
                }
            }
        } catch (error) {
            // If navigation failed, revert the URL change
            if (urlWasUpdated) {
                try {
                    window.history.replaceState({}, '', originalUrl);
                } catch (revertError) {
                    console.error(
                        'Failed to revert URL after navigation error:',
                        revertError
                    );
                }
            }
            throw error;
        }
    }

    _onClick = (e) => {
        // Prevent navigation if router is destroyed
        if (this._isDestroyed) {
            return;
        }

        const isNonNavigationClick =
            e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey;
        if (e.defaultPrevented || isNonNavigationClick) {
            return;
        }

        const anchor = e
            .composedPath()
            .find((n) => n.tagName === 'A');
        if (
            anchor === undefined ||
            anchor.target !== '' ||
            anchor.hasAttribute('download') ||
            anchor.getAttribute('rel') === 'external'
        ) {
            return;
        }

        const href = anchor.href;
        if (
            href === '' ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('javascript:')
        ) {
            return;
        }

        const location = window.location;
        if (anchor.origin !== origin) {
            return;
        }

        e.preventDefault();
        if (href !== location.href) {
            // Use safe navigation for click handling
            this._safeNavigate(async () => {
                await this.goto(anchor.pathname + anchor.search + anchor.hash);
            });
        }
    };

    _onPopState = (_e) => {
        // Prevent navigation if router is destroyed
        if (this._isDestroyed) {
            return;
        }

        // Use safe navigation for popstate handling
        this._safeNavigate(async () => {
            await this.goto(
                window.location.pathname + window.location.search + window.location.hash
            );
        });
    };
}
