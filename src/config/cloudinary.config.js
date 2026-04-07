import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// variables from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// helper function to upload a buffer to cloudinary
export const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: process.env.CLOUDINARY_FOLDER },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      },
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

export default cloudinary;
