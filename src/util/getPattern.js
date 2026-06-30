import { ReactRouterScorer } from "../ReactRouterScorer.js";

// A cache of compiled routes created for PathRouteConfig.
// Rather than converting all given RoutConfigs to URLPatternRouteConfig, this
// lets us make `routes` mutable so users can add new PathRouteConfigs
// dynamically.
export const patternCache = new WeakMap();

// Create a global instance of ReactRouterScorer
export const routerScorer = new ReactRouterScorer();

export function getPattern(route) {
  if (route.pattern !== undefined) {
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
        const pathname = typeof input === "string" ? input : input.pathname;
        return compiled.regex.test(pathname);
      },
      exec: (input) => {
        const pathname = typeof input === "string" ? input : input.pathname;
        const matchResult = routerScorer.matchPathAdvanced(pathname, compiled);
        if (!matchResult) return null;

        return {
          pathname: {
            groups: matchResult.params,
            input: pathname,
          },
        };
      },
    };
    patternCache.set(route, pattern);
  }
  return pattern;
}
