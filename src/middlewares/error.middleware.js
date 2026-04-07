import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

// 4-argument signature is how Express recognizes an error handling middleware
export const errorMiddleware = (err, _req, res, _next) => {
  // if it's our own ApiError, use its statusCode and message
  // otherwise it's an unexpected error — default to 500
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message =
    err instanceof ApiError ? err.message : "Internal Server Error";

  // log the full error in dev so you can see the stack trace
  logger.error(err.message, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    message,
    // only expose error details outside production
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
