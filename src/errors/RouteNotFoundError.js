export class RouteNotFoundError extends Error {
  /**
   * @param {string} message
   * @param {{ currentRoute?: any, currentPathname?: string, targetPath: string }} metadata
   */
  constructor(message, metadata = {}) {
    super(message);
    this.name = "RouteNotFoundError";
    this.metadata = metadata;
  }
}
