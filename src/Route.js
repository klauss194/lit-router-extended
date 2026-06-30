import { getPattern, patternCache } from "./util/getPattern.js";
import { getTailGroup } from "./util/getTailGroup.js";
// canonicalizePath is used in parsePathname to strip any trailing slash that
// the substring-based tail extraction can leave on the matched segment.
// See util/url.js for the full rationale.
import { canonicalizePath, ORIGIN } from "./util/url.js";

/**
 * @typedef {{ params: object, extraParams: object, searchParams: object, hash?: string, signal: AbortSignal }} RouteContext
 * @typedef {{ path: string; name: string; render: (p:Omit<RouteContext, 'signal'>) => Object; enter?:(p:RouteContext) => Object; leave?:(p:RouteContext) =>Object }} RouteConfig
 */
export class Route {
  /**
   *
   * @param {RouteConfig} route
   */
  constructor(route) {
    this.path = route.path;
    this.name = route.name;
    this.render = route.render;
    this.enter = route.enter;
    this.leave = route.leave;

    this.pattern = getPattern(this);
    Object.freeze(this);
  }

  testPathname(pathname) {
    return this.pattern.test(pathname);
  }

  /**
   * @param {string} pathname
   * @returns {{ params: object, pathname: string, tailGroup: string }}
   */
  parsePathname(pathname) {
    const input = pathname;
    const matched = this.pattern.exec(pathname);
    if (!matched) {
      return null;
    }
    const params = matched.pathname.groups || {};
    const rawTail = getTailGroup(params);

    // Remove numeric wildcard captures — they are tail-extraction artifacts,
    // not named route params. getTailGroup already consumed them.
    for (const key of Object.keys(params)) {
      if (/^\d+$/.test(key)) delete params[key];
    }
    const tailGroup = rawTail ? new URL(rawTail, ORIGIN).pathname : "/";

    // Trim the tail segment from pathname using string arithmetic.
    //
    // Guard: !rawTail instead of rawTail === undefined
    //   Covers two distinct cases:
    //   • rawTail === undefined  →  route has no wildcard at all (e.g. /allowed)
    //   • rawTail === ""        →  wildcard exists but captured nothing, which
    //                              happens when the URL ends with a slash that
    //                              canonicalizePath() did not see (e.g. the path
    //                              was already stored before the fix, or comes
    //                              from a source that bypasses parseUrl).
    //   In both cases pathname should equal the full input unchanged.
    if (!rawTail) {
      pathname = input;
    } else {
      // Subtract the tail length to isolate the matched segment.
      // Example: "/dashboard/settings" − "/settings" (9 chars) = "/dashboard/"
      // The trailing slash produced here is cleaned up by canonicalizePath below.
      pathname = pathname.substring(0, pathname.length - rawTail.length || 0);
    }

    // canonicalizePath cleans up the trailing slash that the substring trim
    // leaves behind. Example: after removing "/settings" from "/dashboard/settings"
    // the remainder is "/dashboard/" — canonicalizePath turns it into "/dashboard".
    // Computed once and reused for both pathname and fullPathname.
    const normalizedPathname = canonicalizePath(pathname);

    return {
      params,

      // The matched segment of this route level (tail already removed).
      // Always slash-free thanks to canonicalizePath.
      pathname: normalizedPathname,

      // "/" when no wildcard captured anything (the safe default for child
      // propagation); the actual captured value otherwise.
      tailGroup,

      // Full URL up to and including the tail.
      // fullPathname is only meaningful for the no-op guard and link building.
      //
      // WHY rawTail controls the append:
      //   tailGroup defaults to "/" when rawTail is falsy.  Without this guard
      //   fullPathname would be "/allowed" + "/" = "/allowed/" for every
      //   non-wildcard route — a trailing slash that broke the no-op guard
      //   ("/allowed/" !== "/allowed") and made every same-location navigation
      //   run again instead of short-circuiting.
      fullPathname: rawTail
        ? normalizedPathname + tailGroup
        : normalizedPathname,

      // true only when the wildcard captured a non-empty string.
      // Used by Navigation.pop() and Navigation.hasFocus() to decide whether
      // a child route is currently "pushed".
      // !!rawTail: falsy values (undefined AND "") both yield false,
      // so an empty wildcard capture is not treated as a pushed sub-route.
      hasTail: !!rawTail,
    };
  }

  toString() {
    return this.valueOf();
  }

  valueOf() {
    const parmasMap = (this.pattern?.params || []).join("");
    return `Route::${parmasMap}`;
  }
}
