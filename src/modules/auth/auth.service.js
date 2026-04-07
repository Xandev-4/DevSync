import User from "../../models/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/token.utils.js";
import jwt from "jsonwebtoken";

// strips password and refreshToken before returning user to controller
// User.create() and findOne('+password') return these in memory regardless of select:false
const sanitizeUser = (user) => {
  const { password, refreshToken, ...safeUser } = user.toObject();
  return safeUser;
};

// --- Service Functions ---

export const register = async (email, password) => {
  // construct first — Mongoose generates _id at construction, before any DB write
  const user = new User({ email, password });

  // generate tokens using the pre-generated _id
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // assign refresh token before save — single write, pre-save hook fires once
  user.refreshToken = refreshToken;

  try {
    await user.save();
  } catch (err) {
    // E11000 = unique index violation — race condition where two simultaneous registrations
    // with the same email both pass before either saves — DB unique index is the real guard
    if (err.code === 11000) throw new ApiError(409, "Email already in use");
    throw err;
  }

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

export const login = async (email, password) => {
  // select:false fields must be explicitly opted in
  const user = await User.findOne({ email }).select("+password");

  // deliberately vague — don't reveal whether email exists or password is wrong
  if (!user) throw new ApiError(401, "Invalid credentials");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // updateOne avoids round-tripping the full document (which has '+password' loaded)
  // also skips the pre-save hook entirely — no unnecessary re-hash check
  await User.updateOne({ _id: user._id }, { $set: { refreshToken } });

  // sanitize before returning — user was fetched with '+password', strip it
  return { user: sanitizeUser(user), accessToken, refreshToken };
};

export const refresh = async (incomingRefreshToken) => {
  if (!incomingRefreshToken)
    throw new ApiError(401, "No refresh token provided");

  // guard against missing secret — otherwise swallowed by the catch below
  if (!process.env.JWT_REFRESH_SECRET)
    throw new Error("JWT_REFRESH_SECRET is not defined");

  // verify signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // guard against crafted tokens with missing or malformed id field
  if (!decoded?.id) throw new ApiError(401, "Invalid token payload");

  const accessToken = generateAccessToken(decoded.id);
  const refreshToken = generateRefreshToken(decoded.id);

  // atomic find-and-replace — only matches if token in DB equals incoming token
  // second concurrent request finds no match (token already rotated) → reuse detected
  const user = await User.findOneAndUpdate(
    { _id: decoded.id, refreshToken: incomingRefreshToken },
    { refreshToken },
    { new: true },
  );

  if (!user) throw new ApiError(401, "Refresh token reuse detected");

  return { accessToken, refreshToken };
};

export const logout = async (userId) => {
  // updateOne — no read needed, directly null the refresh token
  // controller handles clearing the HTTP-only cookies
  if (!userId) throw new ApiError(400, "Invalid user ID");
  await User.updateOne({ _id: userId }, { $set: { refreshToken: null } });
};
