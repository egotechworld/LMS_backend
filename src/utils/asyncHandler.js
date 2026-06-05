/**
 * Wraps an async route handler and forwards errors to Express next().
 * Eliminates try/catch boilerplate in controllers.
 *
 * @param {Function} fn  async (req, res, next) => {}
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
