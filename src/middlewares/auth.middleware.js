import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

// named verifyJWT — must match import in all route files
export const verifyJWT = async (req, _res, next) => {
  try {
    // read access token from HTTP-only cookie — never from headers or body
    const token = req.cookies?.accessToken;

    if (!token) throw new ApiError(401, "Unauthorized — no token provided");

    // guard against misconfigured env — jwt.verify(token, undefined) gives misleading errors
    if (!process.env.JWT_ACCESS_SECRET)
      throw new Error("JWT_ACCESS_SECRET is not defined");

    // verify signature and expiry — throws JsonWebTokenError or TokenExpiredError if invalid
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch {
      throw new ApiError(401, "Token expired or invalid");
    }

    // guard against crafted tokens with no id field
    if (!decoded?.id)
      throw new ApiError(401, "Unauthorized — invalid token payload");

    // fetch user — explicitly exclude sensitive fields
    // belt-and-suspenders: protects against future schema changes removing select:false
    const user = await User.findById(decoded.id).select(
      "-password -refreshToken",
    );

    if (!user) throw new ApiError(401, "Unauthorized — user no longer exists");

    // attach full user document — controllers access via req.user
    req.user = user;

    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err); // pass auth errors through as-is
    if (err.status || err.statusCode) return next(err); // pass through HTTP errors with a status
    next(new ApiError(500, err.message || "Server error")); // env misconfig and unknowns → 500, not 401
  }
};
