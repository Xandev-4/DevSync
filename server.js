import http from "http";
import app from "./src/app.js";
import connectDB from "./src/config/db.config.js";
import redisClient from "./src/config/redis.config.js";
import { initSocket } from "./src/sockets/index.js";
import logger from "./src/utils/logger.js";
import dotenv from "dotenv";

// load .env variables into process.env before anything reads them
dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // connect to MongoDB — exits process on failure (handled inside connectDB)
  await connectDB();

  // connect to Redis — exits process on failure
  await redisClient.connect();
  logger.info("Redis connected ✅");

  // wrap Express app in a raw Node HTTP server (Socket.io needs this, not app directly)
  const httpServer = http.createServer(app);

  // attach Socket.io to the HTTP server and register namespaces
  initSocket(httpServer);

  // start listening for incoming requests
  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} 🚀`);
  });
};

// catch any startup failure (DB down, Redis down, etc.) — log it and exit cleanly
startServer().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
