const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../utils/authCookie');
const ApiError = require('../utils/ApiError');

const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (_error) {
    return next(new ApiError('Invalid or expired session', 401, 'INVALID_SESSION'));
  }
};

const optionalAuthenticate = (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    // Public routes remain public; invalid cookies do not grant any access.
  }
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError('Access denied', 403, 'FORBIDDEN'));
    }
    next();
  };
};

module.exports = { authenticate, optionalAuthenticate, authorize };
