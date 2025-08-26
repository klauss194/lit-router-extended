/**
 * Enhanced React Router-style Route Scorer
 * Implements sophisticated multi-factor ranking for precise route matching
 * Based on React Router's ranking algorithm for better match quality
 */
export class ReactRouterScorer {
  constructor() {
    // Enhanced scoring system based on React Router's approach
    this.SEGMENT_WEIGHTS = {
      STATIC: 10,           // Static segments get highest priority
      DYNAMIC: 5,           // Dynamic parameters get medium priority
      OPTIONAL_DYNAMIC: 3,  // Optional parameters get lower priority
      WILDCARD: 1,          // Single wildcards get low priority
      CATCH_ALL: 0.5        // Catch-all wildcards get lowest priority
    };

    // Route ranking factors (in order of importance)
    this.RANKING_FACTORS = {
      STATIC_SEGMENTS: 1000,    // Number of static segments (most important)
      DYNAMIC_SEGMENTS: 100,    // Number of dynamic segments
      OPTIONAL_SEGMENTS: 10,    // Number of optional segments
      WILDCARD_PENALTY: -50,    // Penalty for wildcards
      DEPTH_BONUS: 1,           // Bonus for route depth
      SPECIFICITY_BONUS: 0.1    // Bonus for overall specificity
    };
  }

  /**
   * Calculate the priority score for a route path using React Router-style ranking
   * @param {string} path - The route path (e.g., "/users/:id/posts")
   * @returns {Object} - Detailed scoring breakdown and final score
   */
  scoreRoute(path) {
    if (!path || path === '/') {
      return {
        score: this.RANKING_FACTORS.STATIC_SEGMENTS, // Root path gets high static score
        breakdown: { staticSegments: 1, dynamicSegments: 0, optionalSegments: 0, wildcards: 0, depth: 1 },
        specificity: 1
      };
    }

    // Split path into segments, filtering out empty strings
    const segments = path.split('/').filter(Boolean);

    // Count different segment types for React Router-style ranking
    const breakdown = {
      staticSegments: 0,
      dynamicSegments: 0,
      optionalSegments: 0,
      wildcards: 0,
      depth: segments.length
    };

    segments.forEach(segment => {
      if (segment === '*' || segment === '**') {
        breakdown.wildcards++;
      } else if (segment.startsWith(':')) {
        if (segment.endsWith('?')) {
          breakdown.optionalSegments++;
        } else {
          breakdown.dynamicSegments++;
        }
      } else {
        breakdown.staticSegments++;
      }
    });

    // Calculate final score using React Router's ranking approach
    let score = 0;

    // Static segments are most important (like React Router)
    score += breakdown.staticSegments * this.RANKING_FACTORS.STATIC_SEGMENTS;

    // Dynamic segments add value but less than static
    score += breakdown.dynamicSegments * this.RANKING_FACTORS.DYNAMIC_SEGMENTS;

    // Optional segments add some value
    score += breakdown.optionalSegments * this.RANKING_FACTORS.OPTIONAL_SEGMENTS;

    // Wildcards are penalized
    score += breakdown.wildcards * this.RANKING_FACTORS.WILDCARD_PENALTY;

    // Bonus for depth (more specific routes)
    score += breakdown.depth * this.RANKING_FACTORS.DEPTH_BONUS;

    // Calculate specificity (ratio of static to total segments)
    const totalSegments = breakdown.staticSegments + breakdown.dynamicSegments + breakdown.optionalSegments + breakdown.wildcards;
    const specificity = totalSegments > 0 ? breakdown.staticSegments / totalSegments : 0;
    score += specificity * this.RANKING_FACTORS.SPECIFICITY_BONUS;

    return {
      score,
      breakdown,
      specificity
    };
  }

  /**
   * Compile a route path into a regex pattern for matching
   * @param {string} path - The route path
   * @returns {Object} - Compiled route info
   */
  compileRoute(path) {
    const segments = path.split('/').filter(Boolean);
    const params = [];
    // Make leading slash optional for child routes
    let regexPattern = '^/?';

    segments.forEach((segment, index) => {
      if (index > 0) {
        regexPattern += '/';
      }

      if (segment === '*') {
        // Wildcard - match single segment or more
        regexPattern += '(.*)';
        params.push('0'); // Use numeric key for wildcard groups to match getTailGroup
      } else if (segment === '**') {
        // Deep wildcard - match multiple segments
        regexPattern += '(.*)';
        params.push('**');
      } else if (segment.startsWith(':')) {
        // Dynamic parameter
        const paramName = segment.slice(1).replace('?', '');
        const isOptional = segment.endsWith('?');

        if (isOptional) {
          regexPattern += '([^/]*?)';
        } else {
          regexPattern += '([^/]+)';
        }

        params.push(paramName);
      } else {
        // Static segment - escape special regex characters
        regexPattern += segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    });

    // Handle optional trailing slash and end of string
    regexPattern += '/?$';

    const compiled = {
      regex: new RegExp(regexPattern),
      params,
      segments
    };

    return compiled;
  }

  /**
   * Enhanced path matching using compiled regex patterns
   * @param {string} pathname - The pathname to match
   * @param {Object} compiledRule - The compiled rule
   * @returns {Object|null} - Match result with extracted params or null
   */
  matchPathAdvanced(pathname, compiledRule) {
    // Normalize pathname
    const normalizedPath = pathname.endsWith('/') && pathname !== '/'
      ? pathname.slice(0, -1)
      : pathname;

    const match = compiledRule.regex.exec(normalizedPath);

    if (!match) return null;

    // Extract parameters
    const params = {};
    compiledRule.params.forEach((paramName, index) => {
      if (paramName === '0' || /^\d+$/.test(paramName)) {
        // Numeric keys for wildcard groups
        params[paramName] = match[index + 1];
      } else if (paramName !== '*' && paramName !== '**') {
        params[paramName] = match[index + 1];
      }
    });

    return {
      matched: true,
      params,
      fullMatch: match[0],
      segments: match.slice(1)
    };
  }
}