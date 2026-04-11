import { Router } from "express";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
} from "./auth.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import {
  authRateLimiter,
  loginRateLimiter,
} from "../../middlewares/rateLimiter.middleware.js";

const router = Router();

// POST /api/v1/auth/register
router.post("/register", authRateLimiter, registerController);

// POST /api/v1/auth/login
router.post("/login", loginRateLimiter, loginController);

// POST /api/v1/auth/refresh — no auth needed, refresh token in cookie is the credential
router.post("/refresh", authRateLimiter, refreshController);

// POST /api/v1/auth/logout — verifyJWT ensures req.user.id exists before controller runs
router.post("/logout", authRateLimiter, verifyJWT, logoutController);

export default router;
