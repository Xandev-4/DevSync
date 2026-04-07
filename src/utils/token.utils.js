import jwt from "jsonwebtoken";

// --- Token Generators ---

export const generateAccessToken = (userId) => {
  if (!process.env.JWT_ACCESS_SECRET)
    throw new Error("JWT_ACCESS_SECRET is not defined");
  if (!process.env.JWT_ACCESS_EXPIRY)
    throw new Error("JWT_ACCESS_EXPIRY is not defined");

  return jwt.sign(
    { id: userId }, // 'id' not '_id' — must match socket.user.id in sockets/index.js
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY },
  );
};

export const generateRefreshToken = (userId) => {
  if (!process.env.JWT_REFRESH_SECRET)
    throw new Error("JWT_REFRESH_SECRET is not defined");
  if (!process.env.JWT_REFRESH_EXPIRY)
    throw new Error("JWT_REFRESH_EXPIRY is not defined");

  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY,
  });
};

// --- Cookie Helper ---

// ⚠️ maxAge values below must stay in sync with JWT_ACCESS_EXPIRY and JWT_REFRESH_EXPIRY in .env
// if they drift, the cookie expires before/after the token — silent auth breakage

// ⚠️ sameSite: "strict" works for same-hostname dev (localhost:5173 + localhost:3000)
// if frontend and backend ever deploy to different domains, change to "none" + secure: true

export const setAuthCookies = (res, accessToken, refreshToken) => {
  // secure defaults to true in everything except local dev
  // flipped from NODE_ENV === "production" to prevent silent HTTP exposure on misconfigured deploys
  const isSecure = process.env.NODE_ENV !== "development";

  res.cookie("accessToken", accessToken, {
    httpOnly: true, // JS cannot read this cookie — XSS protection
    secure: isSecure,
    sameSite: "strict", // never sent on cross-site requests — CSRF protection
    maxAge: 15 * 60 * 1000, // 15 min — must match JWT_ACCESS_EXPIRY
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — must match JWT_REFRESH_EXPIRY
    path: "/api/v1/auth/refresh", // only sent to refresh endpoint — not every API request
  });
};

// --- Cookie Clearer ---
// ⚠️ options must match setAuthCookies exactly — mismatched path/secure/sameSite = cookie not cleared
export const clearAuthCookies = (res) => {
  const isSecure = process.env.NODE_ENV !== "development";

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "strict",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "strict",
    path: "/api/v1/auth/refresh", // must match the path set in setAuthCookies exactly
  });
};
