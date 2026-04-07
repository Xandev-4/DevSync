import { createClient } from "redis";
import logger from "../utils/logger.js";

// create redis client with url from .env
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

// listen for errors
redisClient.on("error", (err) => {
  logger.error(`Redis error , ${err.message}`);
});

export default redisClient;
