import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { setAuthCookies, clearAuthCookies } from "../../utils/token.utils.js";
import * as authService from "./auth.service.js";

// POST /api/v1/auth/register
export const registerController = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    throw new ApiError(400, "Email, password and name are required");
  }

  // service handles validation, hashing, token generation
  const { user, accessToken, refreshToken } = await authService.register(
    email,
    password,
    name,
  );

  // set both tokens as HTTP-only cookies
  setAuthCookies(res, accessToken, refreshToken);

  res
    .status(201)
    .json(new ApiResponse(201, { user }, "Account created successfully"));
});

// POST /api/v1/auth/login
export const loginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const { user, accessToken, refreshToken } = await authService.login(
    email,
    password,
  );

  setAuthCookies(res, accessToken, refreshToken);

  res
    .status(200)
    .json(new ApiResponse(200, { user }, "Logged in successfully"));
});

// POST /api/v1/auth/refresh
// refresh token is read from cookie — not from req.body
export const refreshController = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  const { accessToken, refreshToken } =
    await authService.refresh(incomingRefreshToken);

  // overwrite old cookies with new rotated tokens
  setAuthCookies(res, accessToken, refreshToken);

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Tokens refreshed successfully"));
});

// POST /api/v1/auth/logout
// req.user is attached by auth.middleware.js — controller just needs the id
export const logoutController = asyncHandler(async (req, res) => {
  if (!req.user?.id) throw new ApiError(401, "Unauthorized");

  await authService.logout(req.user.id);

  // clear both cookies from the browser
  clearAuthCookies(res);

  res.status(200).json(new ApiResponse(200, {}, "Logged out successfully"));
});
