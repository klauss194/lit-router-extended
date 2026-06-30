/**
 * Walks the route tree from `start` downward, merging params, extraParams,
 * and searchParams from every active Routes level into a single flat object.
 *
 * INTENTIONALLY returns a NEW object on every call — params are always fresh.
 * This is by design, not a bug or a missing memoisation.
 *
 * Rationale: router state can change at any level of the tree independently
 * (e.g. a child route updates its params without the parent re-navigating).
 * Caching would require invalidation logic tied to every _navigate call across
 * the entire tree, adding complexity for negligible gain given how shallow
 * the route trees in this app are (typically 2-3 levels).
 *
 * Do NOT add memoisation here without first profiling a real performance issue.
 *
 * @param {object} start
 * @param {object} [stop]
 * @returns {{ params: Record<string, string>, extraParams: Record<string, any>, searchParams: Record<string, string> }}
 */
export function collectParams(start, stop = null) {
  let paramsStore = {};
  let extraParamsStore = {};
  let searchParamsStore = {};

  const getStateFromInstance = (instance) => {
    if (instance?.state && typeof instance.state === "object") {
      return {
        params: instance.state.params ?? {},
        extraParams: instance.state.extraParams ?? {},
        searchParams: instance.state.searchParams ?? {},
      };
    }

    // Legacy fallback for older RoutesController shape.
    return {
      params: instance?._currentParams ?? {},
      extraParams: instance?._currentExtraParams ?? {},
      searchParams: instance?._currentSearchParams ?? {},
    };
  };

  const getChildrenFromInstance = (instance) => {
    if (instance?._children instanceof Set) {
      return [...instance._children];
    }

    if (Array.isArray(instance?._childRoutes)) {
      return instance._childRoutes.map((child) => child.ref).filter(Boolean);
    }

    return [];
  };

  /**
   * A recursive function to traverse the route hierarchy and collect parameters.
   * @param {object} instance - The current router instance to process.
   * @param {object | null} stopInstance - An optional instance to stop traversal at.
   * @returns {boolean} whether traversal reached stopInstance.
   */
  function traverseRoutesToCollectParams(instance, stopInstance = null) {
    if (!instance) {
      return false;
    }

    const { params, extraParams, searchParams } =
      getStateFromInstance(instance);

    paramsStore = Object.entries(params)
      .filter(([key]) => typeof key !== "number")
      .reduce((store, [k, v]) => ({ ...store, [k]: v }), paramsStore);

    Object.assign(extraParamsStore, extraParams);
    Object.assign(searchParamsStore, searchParams);

    if (stopInstance && instance === stopInstance) {
      return true;
    }

    const children = getChildrenFromInstance(instance);
    for (const child of children) {
      if (traverseRoutesToCollectParams(child, stopInstance)) {
        return true;
      }
    }

    return false;
  }

  // Start collecting from the top-router
  traverseRoutesToCollectParams(start, stop);

  return {
    params: paramsStore,
    extraParams: extraParamsStore,
    searchParams: searchParamsStore,
  };
}
