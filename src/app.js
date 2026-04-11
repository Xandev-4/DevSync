import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

// trust first proxy hop — required for express-rate-limit to read real client IPs
// without this, req.ip is the proxy's IP in production (Railway, Render, Heroku, etc.)
app.set("trust proxy", 1);

// --- Middlewares ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true, // needed for HTTP-only cookies to be sent cross-origin
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use((req, _res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  next();
});

// --- Health Check ---
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

// --- Module Routes (wired in, empty for now) ---
import authRoutes from "./modules/auth/auth.routes.js";
// import profileRoutes from "./modules/profile/profile.routes.js";
// import feedRoutes from "./modules/feed/feed.routes.js";
// import matchRoutes from "./modules/match/match.routes.js";
// import chatRoutes from "./modules/chat/chat.routes.js";
// import postRoutes from "./modules/post/post.routes.js";
// import notificationRoutes from "./modules/notification/notification.routes.js";

app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/profile", profileRoutes);
// app.use("/api/v1/feed", feedRoutes);
// app.use("/api/v1/swipes", matchRoutes);
// app.use("/api/v1/chat", chatRoutes);
// app.use("/api/v1/posts", postRoutes);
// app.use("/api/v1/notifications", notificationRoutes);

// --- Error Handler (must be last) ---
app.use(errorMiddleware);

export default app;
