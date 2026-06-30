/**
 * @extends {Set<import("./Route").Route>}
 */
export class RoutesSet extends Set {
  options = {
    fallbackRoute: null,
  };

  matchRoute(pathname) {
    const sortedRoutes = this.getSortedRoutes();

    for (let i = 0; i < sortedRoutes.length; i++) {
      const route = sortedRoutes[i];
      if (route.testPathname({ pathname })) {
        return route;
      }
    }

    return this.options.fallbackRoute ?? undefined;
  }

  getSortedRoutes() {
    const routes = [...this];

    return routes.sort((a, b) => {
      const scoreDiff = b.pattern.score - a.pattern.score;
      if (scoreDiff !== 0) return scoreDiff;

      const specificityDiff = b.pattern.specificity - a.pattern.specificity;
      if (specificityDiff !== 0) return specificityDiff;

      return routes.indexOf(a) - routes.indexOf(b);
    });
  }
}
