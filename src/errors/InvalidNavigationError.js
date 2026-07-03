export class InvalidNavigationError extends Error {
  /**
   * @param {string} message
   * @param {{ currentRoute?: any, pathname?: string, operation?: string, reason?: string }} metadata
   */
  constructor(message, metadata = {}) {
    super(message);
    this.name = "InvalidNavigationError";
    this.metadata = metadata;
  }
}
