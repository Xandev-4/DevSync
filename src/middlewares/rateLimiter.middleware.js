import rateLimit from "express-rate-limit";

// applied to /register and /refresh routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: "Too many requests, please try again later",
  },
});

// tighter limit specifically for /login — 10 attempts per 15 min
// skipSuccessfulRequests: true — legitimate logins don't burn quota
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count toward the limit
  message: {
    success: false,
    data: null,
    message: "Too many login attempts, please try again later",
  },
});

// applied to /match routes — tighter limit to prevent swipe spam
export const matchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: "Slow down — too many swipe requests",
  },
});
