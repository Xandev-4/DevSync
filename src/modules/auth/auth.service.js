import mongoose from "mongoose";
import User from "../../models/user.model.js";
import Profile from "../../models/profile.model.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/token.utils.js";
import jwt from "jsonwebtoken";

const sanitizeUser = (user) => {
  const { password, refreshToken, ...safeUser } = user.toObject();
  return safeUser;
};

// --- Service Functions ---

export const register = async (email, password, name) => {
  const user = new User({ email, password });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await user.save({ session });
    await Profile.create([{ userId: user._id, name }], { session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    if (err.code === 11000) throw new ApiError(409, "Email already in use");
    throw err;
  } finally {
    session.endSession();
  }

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

export const login = async (email, password) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) throw new ApiError(401, "Invalid credentials");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await User.updateOne({ _id: user._id }, { $set: { refreshToken } });

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

export const refresh = async (incomingRefreshToken) => {
  if (!incomingRefreshToken)
    throw new ApiError(401, "No refresh token provided");

  if (!process.env.JWT_REFRESH_SECRET)
    throw new Error("JWT_REFRESH_SECRET is not defined");

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  if (!decoded?.id) throw new ApiError(401, "Invalid token payload");

  const accessToken = generateAccessToken(decoded.id);
  const refreshToken = generateRefreshToken(decoded.id);

  const user = await User.findOneAndUpdate(
    { _id: decoded.id, refreshToken: incomingRefreshToken },
    { refreshToken },
    { new: true },
  );

  if (!user) throw new ApiError(401, "Refresh token reuse detected");

  return { accessToken, refreshToken };
};

export const logout = async (userId) => {
  if (!userId) throw new ApiError(400, "Invalid user ID");
  await User.updateOne({ _id: userId }, { $set: { refreshToken: null } });
};
