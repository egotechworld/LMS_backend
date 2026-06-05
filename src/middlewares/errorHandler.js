/**
 * Global Express error handler.
 * Handles ApiError (custom) and Multer errors gracefully.
 */
const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  // Multer file size / type errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: { message: `File upload error: ${err.message}` },
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${statusCode}] ${message}`, err.stack || '');
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
