import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, // no two users can have the same email — enforced at DB level
      lowercase: true, // normalizes "User@Gmail.com" → "user@gmail.com" before saving
      trim: true, // strips accidental spaces from both ends
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"], // basic regex check — rejects "notanemail"
    },

    password: {
      type: String,
      required: true,
      select: false, // NEVER returned in query results by default — must explicitly do .select('+password')
      minlength: [8, "Password must be at least 8 characters"],
      maxlength: [72, "Password must be at most 72 characters"], // bcrypt silently truncates anything over 72 bytes — this makes the limit explicit
    },

    role: {
      type: String,
      enum: ["user", "admin"], // only these two values are accepted — anything else throws a validation error
      default: "user", // every new signup is a regular user unless explicitly set to admin
    },

    refreshToken: {
      type: String,
      default: null,
      select: false, // never leak refresh tokens in query results — same reason as password
      index: { sparse: true }, // sparse index = only index documents where refreshToken is NOT null
      // logged-out users have null — no point indexing those
    },
  },
  {
    timestamps: true, // auto-adds createdAt and updatedAt fields to every document
  },
);

// --- Pre-save Hook ---
// fires automatically before every .save() call
// the isModified check is critical — without it, every profile update (e.g. changing email)
// would re-hash an already-hashed password, making it permanently unverifiable
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // skip hashing if password didn't change
  this.password = await bcrypt.hash(this.password, 10); // 10 = salt rounds (industry standard)
  next();
});

// --- Instance Method ---
// attached to every User document — called on a specific user instance, not the model
// usage: const isMatch = await user.comparePassword(plainText)
// ⚠️  remember: password field has select: false — you MUST do User.findOne(...).select('+password')
//     before calling this, otherwise this.password will be undefined and it'll always return false
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password); // bcrypt handles the salt internally
};

const User = mongoose.model("User", userSchema); // registers the model with mongoose as "User" collection

export default User;
