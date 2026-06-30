/**
 * Returns the tail of a pathname groups object. This is the match from a
 * wildcard at the end of a pathname pattern, like `/foo/*`
 */

export function getTailGroup(groups) {
  let tailKey;
  for (const key of Object.keys(groups)) {
    if (/\d+/.test(key) && (tailKey === undefined || key > tailKey)) {
      tailKey = key;
    }
  }
  return tailKey && groups[tailKey];
}
