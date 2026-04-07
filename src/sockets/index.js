import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

// extracted so it can be applied to each namespace without repeating code
const authenticateSocket = (socket, next) => {
  try {
    // grab token passed from frontend via socket({ auth: { token } })
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: no token provided"));
    }

    // verify and decode — throws if expired or tampered
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // attach decoded payload to socket for use inside event handlers
    socket.user = decoded;

    next();
  } catch (error) {
    logger.error("Socket auth failed:", error.message);
    next(new Error("Authentication error: invalid token"));
  }
};

export const initSocket = (httpServer) => {
  // attach Socket.io to the HTTP server
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // --- /chat namespace ---
  const chatNamespace = io.of("/chat");

  // apply auth middleware directly on the namespace — not on io
  chatNamespace.use(authenticateSocket);

  chatNamespace.on("connection", (socket) => {
    logger.debug(`[chat] user connected: ${socket.user.id}`);

    // TODO Phase 6: register chat event handlers here
    // socket.on("join_room", ...)
    // socket.on("send_message", ...)
    // socket.on("typing_start", ...)
    // socket.on("typing_stop", ...)

    socket.on("disconnect", () => {
      logger.debug(`[chat] user disconnected: ${socket.user?.id}`);
    });
  });

  // --- /notifications namespace ---
  const notifNamespace = io.of("/notifications");

  // apply auth middleware directly on the namespace — not on io
  notifNamespace.use(authenticateSocket);

  notifNamespace.on("connection", (socket) => {
    logger.debug(`[notifications] user connected: ${socket.user?.id}`);

    // TODO Phase 5+: register notification event handlers here

    socket.on("disconnect", () => {
      logger.debug(`[notifications] user disconnected: ${socket.user?.id}`);
    });
  });

  logger.info("Socket.io initialized ✅");

  return io;
};
