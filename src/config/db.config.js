import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${process.env.DB_NAME}`,
    );
    logger.info(
      `MongoDB connected! DB HOST: ${connectionInstance.connection.host}`,
    );
  } catch (error) {
    logger.error("MONGODB Connection error: ", { error });
    process.exit(1);
  }
};

export default connectDB;
