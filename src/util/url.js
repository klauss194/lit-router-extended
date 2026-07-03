export const ORIGIN =
  location.origin || location.protocol + "//" + location.host;

/**
 * Strips the trailing slash from a pathname, preserving the root "/".
 *
 * WHY THIS EXISTS
 * ────────────────
 * The original router used the browser's URLPattern API, which canonicalises
 * both patterns and inputs according to the URL Standard — trailing slashes on
 * pathnames were silently normalised before any matching occurred.
 *
 * When URLPattern was replaced with a custom regex engine (ReactRouterScorer)
 * that guarantee disappeared. Trailing slashes started leaking into:
 *   • Route.parsePathname  →  state.pathname / state.fullPathname get a "/"
 *   • Router.goto no-op guard  →  "/foo/" !== "/foo" → guard never fired
 *   • ReactRouterScorer.matchPathAdvanced  →  had to normalise locally
 *
 * HOW IT IS APPLIED
 * ──────────────────
 * canonicalizePath() is called on every pathname that EXITS parseUrl() and
 * resolveUrl() — the two functions all navigation paths flow through before
 * reaching _navigate(). This single application point means the rest of the
 * router (matching, state, fullPathname, no-op guard, link building) can
 * assume pathnames are already clean, with no scattered .replace() calls.
 *
 * INVARIANT ENFORCED
 * ──────────────────
 * Every pathname held in router state and every pathname reaching the regex
 * engine is either exactly "/" or a string that does NOT end with "/".
 *
 * "/articles/"  →  "/articles"
 * "/articles"   →  "/articles"   (idempotent)
 * "/"           →  "/"           (root preserved)
 *
 * @param {string} pathname
 * @returns {string}
 */
export function canonicalizePath(pathname) {
  return pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Native URL-based utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a URL or path string into its components.
 * Handles full URLs (http://...) and bare paths (/path?q=1#hash).
 *
 * @param {string} url
 * @returns {{ pathname: string, searchParams: Record<string, string>, hash: string }}
 */
export function parseUrl(url) {
  const parsed = new URL(url, ORIGIN);
  return {
    // canonicalizePath: new URL preserves trailing slashes (spec-correct) but
    // the router treats "/foo" and "/foo/" as the same route. Strip here so
    // nothing downstream needs to handle both forms.
    pathname: canonicalizePath(parsed.pathname),
    searchParams: Object.fromEntries(parsed.searchParams),
    hash: parsed.hash ? parsed.hash.slice(1) : "",
  };
}

/**
 * Resolve a target path against a base path.
 * Handles relative (./, ../) and absolute (/) paths.
 *
 * @param {string} basePath - Current location path
 * @param {string} targetPath - Path to resolve
 * @returns {{ pathname: string, searchParams: Record<string, string>, hash: string }}
 */
export function resolveUrl(basePath, targetPath) {
  // Absolute target → parse directly, don't resolve against base
  if (targetPath.startsWith("/")) {
    const target = new URL(targetPath, ORIGIN);
    return {
      // canonicalizePath: normalise here so every caller of resolveUrl
      // (goto, navigate, _onAnchorClick, _onPopState) receives a clean pathname.
      pathname: canonicalizePath(target.pathname),
      searchParams: Object.fromEntries(target.searchParams),
      hash: target.hash ? target.hash.slice(1) : "",
    };
  }

  // Relative target → resolve against base
  const base = new URL(basePath, ORIGIN);
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const target = new URL(targetPath, base);
  return {
    // canonicalizePath: relative resolution can also produce trailing slashes
    // (e.g. new URL('./', 'http://x/articles/') → '/articles/'). Normalise
    // for the same reason as the absolute branch above.
    pathname: canonicalizePath(target.pathname),
    searchParams: Object.fromEntries(target.searchParams),
    hash: target.hash ? target.hash.slice(1) : "",
  };
}

/**
 * Build a href string from separate components.
 * Handles searchParams as an object (serializes via URLSearchParams).
 *
 * @param {string} pathname
 * @param {Record<string, string> | URLSearchParams} [searchParams]
 * @param {string} [hash] - without the # prefix
 * @returns {string} e.g. "/client/orders?tab=1#section"
 */
export function buildHref(pathname, searchParams, hash) {
  const url = new URL(pathname || "/", ORIGIN);
  if (searchParams && typeof searchParams === "object") {
    const params = new URLSearchParams(searchParams);
    if (params.toString()) url.search = params.toString();
  }
  if (hash) url.hash = hash;
  return url.pathname + url.search + url.hash;
}

/**
 * Read a Location-like object as a canonical path string.
 * Handles window.location, anchor elements, or any { pathname, search, hash }.
 *
 * canonicalizePath is applied to the pathname so the result is consistent
 * with every other url.js function. Without it, a browser URL like
 * "/enter-test/" (trailing slash) would produce a different string than
 * buildHref("/enter-test", ...) which builds from a canonicalized resolveUrl
 * result. The mismatch breaks the same-URL early-return check in navigate():
 *
 *   href                          = "/enter-test"   (canonical, from buildHref)
 *   locationToHref(window.location)= "/enter-test/"  (raw, if browser had slash)
 *   "/enter-test" !== "/enter-test/"  →  early return skipped  →  redundant nav
 *
 * @param {Location | HTMLAnchorElement | { pathname?: string, search?: string, hash?: string }} loc
 * @returns {string} e.g. "/client/orders?tab=1#section"
 */
export function locationToHref(loc) {
  const url = new URL(loc.pathname || "/", ORIGIN);
  if (loc.search) url.search = loc.search;
  if (loc.hash) url.hash = loc.hash;
  // canonicalizePath: same reason as parseUrl / resolveUrl — strip trailing
  // slash so this function's output is always comparable to buildHref output.
  return canonicalizePath(url.pathname) + url.search + url.hash;
}

/**
 * Compare current browser location to a navigation target.
 * Order-independent searchParams comparison.
 *
 * @param {string} currentHref - Full URL (e.g. window.location.href)
 * @param {string} nextPathname - Target pathname
 * @param {Record<string, string>} [nextSearchParams] - Target search params
 * @param {string} [nextHash] - Target hash (without #)
 * @returns {boolean} true if same location
 */
export function isSameLocation(
  currentHref,
  nextPathname,
  nextSearchParams,
  nextHash,
) {
  const current = new URL(currentHref);
  const next = new URL(nextPathname || "/", current.origin);
  if (nextSearchParams && typeof nextSearchParams === "object") {
    next.search = new URLSearchParams(nextSearchParams).toString();
  }
  if (nextHash) next.hash = nextHash;
  current.searchParams.sort();
  next.searchParams.sort();
  return (
    current.pathname === next.pathname &&
    current.search === next.search &&
    current.hash === next.hash
  );
}

/**
 * Join two path segments using native URL resolution.
 *
 * @param {string} [base] - Base path
 * @param {string} [path] - Path to join
 * @returns {string} Joined path, always absolute (starts with /)
 */
export function joinPaths(base, path) {
  if (!base && !path) return "/";
  if (!base) return new URL(path, ORIGIN).pathname;
  if (!path) return new URL(base, ORIGIN).pathname;

  // Always treat path as relative (strip leading /)
  if (path.startsWith("/")) path = path.slice(1);

  // Ensure base has trailing slash for resolution
  if (!base.endsWith("/")) base += "/";

  // Deduplicate boundary: if base ends with /X/ and path starts with X/
  const baseSegments = base.split("/").filter(Boolean);
  const pathSegments = path.split("/").filter(Boolean);
  if (
    baseSegments.length > 0 &&
    pathSegments.length > 0 &&
    baseSegments[baseSegments.length - 1] === pathSegments[0]
  ) {
    path = pathSegments.slice(1).join("/");
    if (!path) return new URL(base, ORIGIN).pathname;
  }

  return new URL(path, ORIGIN + base).pathname;
}
