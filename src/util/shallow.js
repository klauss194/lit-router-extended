export function shallowEqual(objA, objB) {
  if (typeof objA !== "object" || !objA || typeof objB !== "object" || !objB) {
    return false;
  }

  if (Object.is(objA, objB)) return true;

  const keysB = Object.keys(objB);
  const keysA = Object.keys(objA);

  if (keysA.length !== keysB.length) return false;

  for (let key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) {
      return false;
    }

    if (Array.isArray(objA[key]) && Array.isArray(objB[key])) {
      // Arrays are compared by content, not reference.
      // IMPORTANT: must `continue` after this block — without it, execution falls
      // through to the Object.is() check below, which always returns false for
      // two distinct array references even if their contents are identical.
      if (objA[key].length !== objB[key].length) {
        return false;
      }
      for (let i = 0; i < objA[key].length; i++) {
        if (!Object.is(objA[key][i], objB[key][i])) {
          return false;
        }
      }
      continue; // ← skip the Object.is() reference check for arrays
    }

    if (!Object.is(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}

export function shallowDiff(objA, objB) {
  if (typeof objA !== "object" || !objA || typeof objB !== "object" || !objB) {
    return [];
  }

  const keysB = Object.keys(objB);
  if (Object.is(objA, objB)) return keysB;

  const keysA = Object.keys(objA);
  if (keysA.length !== keysB.length) return keysB;

  const diff = [];
  for (let key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) {
      diff.push(key);
      continue;
    }

    if (Array.isArray(objA[key]) && Array.isArray(objB[key])) {
      // Arrays are compared by content, not reference.
      // IMPORTANT: must `continue` after this block — without it, execution falls
      // through to the Object.is() check below, which always marks two distinct
      // array references as different even if their contents are identical.
      if (objA[key].length !== objB[key].length) {
        diff.push(key);
        continue;
      }
      let arrayDiffers = false;
      for (let i = 0; i < objA[key].length; i++) {
        if (!Object.is(objA[key][i], objB[key][i])) {
          arrayDiffers = true;
          break;
        }
      }
      if (arrayDiffers) diff.push(key);
      continue; // ← skip the Object.is() reference check for arrays
    }

    if (!Object.is(objA[key], objB[key])) {
      diff.push(key);
    }
  }

  return diff;
}
