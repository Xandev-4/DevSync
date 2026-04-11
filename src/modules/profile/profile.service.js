import streamifier from "streamifier";
import Profile, {
  ROLE_TYPES,
  GENDER_TYPES,
} from "../../models/profile.model.js";
import cloudinary from "../../config/cloudinary.config.js";
import redisClient from "../../config/redis.config.js";
import { ApiError } from "../../utils/ApiError.js";
import logger from "../../utils/logger.js";
import { extractResumeData } from "../../services/gemini.service.js"; // 👈

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ─── Get My Profile ────────────────────────────────────────────────────────────

export const getMyProfile = async (userId) => {
  const profile = await Profile.findOne({ userId }).lean();
  if (!profile) throw new ApiError(404, "Profile not found");
  return profile;
};

// ─── Get Profile By ID (public — feed cards) ───────────────────────────────────

export const getProfileById = async (userId) => {
  const profile = await Profile.findOne({ userId }).select("-resumeUrl").lean();
  if (!profile) throw new ApiError(404, "Profile not found");
  return profile;
};

// ─── Update My Profile ─────────────────────────────────────────────────────────

export const updateMyProfile = async (userId, updateData) => {
  const { name, age, gender, bio, githubUrl, techStack, roleType, city } =
    updateData;

  const whitelisted = {};
  if (name !== undefined) whitelisted.name = name;
  if (age !== undefined) {
    if (!Number.isInteger(age) || age < 13 || age > 100)
      throw new ApiError(400, "Age must be a whole number between 13 and 100");
    whitelisted.age = age;
  }
  if (gender !== undefined) {
    if (!GENDER_TYPES.includes(gender))
      throw new ApiError(
        400,
        `Invalid gender. Must be one of: ${GENDER_TYPES.join(", ")}`,
      );
    whitelisted.gender = gender;
  }
  if (bio !== undefined) whitelisted.bio = bio;
  if (githubUrl !== undefined) whitelisted.githubUrl = githubUrl;
  if (techStack !== undefined) whitelisted.techStack = techStack;

  if (roleType !== undefined) {
    if (!ROLE_TYPES.includes(roleType))
      throw new ApiError(
        400,
        `Invalid roleType. Must be one of: ${ROLE_TYPES.join(", ")}`,
      );
    whitelisted.roleType = roleType;
  }

  if (city !== undefined) {
    const { name: cityName, stateCode, countryCode } = city ?? {};
    if (!cityName || !stateCode || !countryCode)
      throw new ApiError(
        400,
        "city must include name, stateCode, and countryCode",
      );
    whitelisted.city = { name: cityName, stateCode, countryCode };
  }

  const updated = await Profile.findOneAndUpdate(
    { userId },
    { $set: whitelisted },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ApiError(404, "Profile not found");

  if (updateData.techStack !== undefined || updateData.roleType !== undefined) {
    try {
      await redisClient.del(`feed:${userId}`);
    } catch (err) {
      logger.warn(
        `Feed cache invalidation failed for user ${userId}: ${err.message}`,
      );
    }
  }

  return updated;
};

// ─── Upload Avatar ─────────────────────────────────────────────────────────────

const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(new ApiError(500, "Cloudinary upload failed"));
        resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const uploadAvatar = async (userId, fileBuffer, mimetype) => {
  if (!ALLOWED_IMAGE_TYPES.includes(mimetype))
    throw new ApiError(400, "Avatar must be a JPEG, PNG, or WebP image");

  const result = await uploadToCloudinary(fileBuffer, {
    folder: "devsync/avatars",
    resource_type: "image",
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  });

  const updated = await Profile.findOneAndUpdate(
    { userId },
    { $set: { avatarUrl: result.secure_url } },
    { new: true },
  );
  if (!updated) throw new ApiError(404, "Profile not found");

  return updated;
};

// ─── Parse Resume ──────────────────────────────────────────────────────────────

export const parseResume = async (userId, fileBuffer, mimetype) => {
  if (mimetype !== "application/pdf")
    // 👈 genAI guard removed — gemini.service.js handles it
    throw new ApiError(400, "Resume must be a PDF");

  const uploadResult = await uploadToCloudinary(fileBuffer, {
    folder: "devsync/resumes",
    resource_type: "raw",
  });
  await Profile.findOneAndUpdate(
    { userId },
    { $set: { resumeUrl: uploadResult.secure_url } },
  );

  try {
    const parsed = await extractResumeData(fileBuffer.toString("base64"));
    return parsed;
  } catch (err) {
    logger.error(`Resume parsing failed for user ${userId}: ${err.message}`);
    throw new ApiError(
      422,
      "Resume parsing failed. Please fill in your skills manually.",
    );
  }
};
