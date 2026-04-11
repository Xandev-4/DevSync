import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar as uploadAvatarService,
  parseResume,
  getProfileById,
} from "./profile.service.js";

export const getMe = asyncHandler(async (req, res) => {
  const profile = await getMyProfile(req.user._id);
  res.status(200).json(new ApiResponse(200, profile, "Profile fetched"));
});

export const updateMe = asyncHandler(async (req, res) => {
  const updated = await updateMyProfile(req.user._id, req.body);
  res.status(200).json(new ApiResponse(200, updated, "Profile updated"));
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");
  if (req.file.size > 5 * 1024 * 1024)
    throw new ApiError(400, "File too large. Max 5MB");
  if (!req.file.mimetype.startsWith("image/"))
    throw new ApiError(400, "Only images allowed");

  const updated = await uploadAvatarService(
    req.user._id,
    req.file.buffer,
    req.file.mimetype,
  );
  res
    .status(200)
    .json(
      new ApiResponse(200, { avatarUrl: updated.avatarUrl }, "Avatar uploaded"),
    );
});

export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");
  if (req.file.size > 5 * 1024 * 1024)
    throw new ApiError(400, "File too large. Max 5MB");
  if (req.file.mimetype !== "application/pdf")
    throw new ApiError(400, "Only PDFs allowed");

  const parsedData = await parseResume(
    req.user._id,
    req.file.buffer,
    req.file.mimetype,
  );
  res
    .status(200)
    .json(new ApiResponse(200, parsedData, "Resume parsed successfully"));
});

export const getProfile = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.userId))
    throw new ApiError(400, "Invalid user ID");

  const profile = await getProfileById(req.params.userId);
  res.status(200).json(new ApiResponse(200, profile, "Profile fetched"));
});
