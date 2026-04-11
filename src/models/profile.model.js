import mongoose from "mongoose";

export const ROLE_TYPES = [
  "Frontend",
  "Backend",
  "Full-stack",
  "Designer",
  "ML",
  "DevOps",
];

export const GENDER_TYPES = ["Male", "Female", "Other", "Prefer not to say"];

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 18 },
    gender: { type: String, enum: GENDER_TYPES },
    bio: { type: String, default: "", trim: true },
    githubUrl: {
      type: String,
      default: "",
      trim: true,
      match: [
        /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/?$/,
        "Invalid GitHub URL",
      ],
    },
    techStack: {
      type: [String],
      default: [],
      set: (tags) => tags.map((t) => t.trim().toLowerCase()),
    },
    roleType: {
      type: String,
      enum: ROLE_TYPES,
    },
    city: {
      name: { type: String, default: "" },
      stateCode: { type: String, default: "" },
      countryCode: { type: String, default: "" },
    },
    avatarUrl: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

profileSchema.index({ techStack: 1 });
profileSchema.index({
  roleType: 1,
  "city.stateCode": 1,
  "city.countryCode": 1,
});

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;
