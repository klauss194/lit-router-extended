/**
 * Paste-friendly router trace logger.
 *
 * Activate in DevTools:
 *   localStorage.setItem('router:trace', '1'); location.reload();
 *
 * Export the last 500 events as plain text:
 *   copy(__routerTrace())
 *
 * Format: `+12.4ms  [nav#7] [routes:HOME-MODALS] action key=val key2=val2`
 *
 * Designed so a copy-pasted trace survives across console boundaries:
 * - One event per line, no console.group / console.trace
 * - No object dumps; structured fields with primitive formatting
 * - Stable column layout for grep/awk over the raw text
 */

const enabled = (() => {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("router:trace") === "1"
    );
  } catch {
    return false;
  }
})();

const t0 =
  enabled && typeof performance !== "undefined" ? performance.now() : 0;
const ring = [];
const RING_MAX = 500;

export function isTracing() {
  return enabled;
}

/**
 * Emit one structured log line.
 *
 * @param {string} tag - short bracketed tag (e.g. "router", "routes:HOME-MODALS", "abort", "render")
 * @param {number | null | undefined} navId - nav id, or null/undefined for events outside a nav
 * @param {string} action - one short verb describing the event (e.g. "start", "commit", "fast-path")
 * @param {Record<string, unknown>} [fields] - structured key/value fields, undefined values dropped
 */
export function log(tag, navId, action, fields = {}) {
  if (!enabled) return;
  const t = (performance.now() - t0).toFixed(1);
  const navStr = navId == null ? "" : `[nav#${navId}] `;
  const fieldStr = formatFields(fields);
  const line = `+${t}ms  ${navStr}[${tag}] ${action}${fieldStr ? " " + fieldStr : ""}`;
  ring.push(line);
  if (ring.length > RING_MAX) ring.shift();
  console.log(line);
}

/**
 * Diff two flat objects, returning a single-line `{key:new↞old, …}` string of
 * the keys that changed. Returns `null` if nothing changed.
 *
 * @param {Record<string, unknown> | null | undefined} prev
 * @param {Record<string, unknown> | null | undefined} next
 * @returns {string | null}
 */
export function diff(prev, next) {
  if (prev === next) return null;
  const a = prev ?? {};
  const b = next ?? {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const parts = [];
  for (const key of keys) {
    if (shallowEq(a[key], b[key])) continue;
    parts.push(`${key}:${formatVal(b[key])}↞${formatVal(a[key])}`);
  }
  if (parts.length === 0) return null;
  return "{" + parts.join(",") + "}";
}

/**
 * Render the in-memory ring buffer as a single newline-delimited string.
 * Useful in DevTools: `copy(__routerTrace())`.
 *
 * @returns {string}
 */
export function exportTrace() {
  return ring.join("\n");
}

export function clearTrace() {
  ring.length = 0;
}

function formatFields(fields) {
  const parts = [];
  for (const key of Object.keys(fields)) {
    const v = fields[key];
    if (v === undefined) continue;
    parts.push(`${key}=${formatVal(v)}`);
  }
  return parts.join(" ");
}

function formatVal(v) {
  if (v === null || v === undefined) return "∅";
  if (v === "") return "∅";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return "[" + v.map(formatVal).join(",") + "]";
  }
  if (typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length === 0) return "{}";
    return "{" + keys.map((k) => `${k}:${formatVal(v[k])}`).join(",") + "}";
  }
  return String(v);
}

function shallowEq(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const key of ak) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

if (typeof window !== "undefined") {
  // eslint-disable-next-line no-undef
  window.__routerTrace = exportTrace;
  // eslint-disable-next-line no-undef
  window.__routerTraceClear = clearTrace;
}
