import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import upload from "../../config/multer.config.js";
import {
  getMe,
  updateMe,
  uploadAvatar,
  uploadResume,
  getProfile,
} from "./profile.controller.js";

const router = Router();

router.get("/me", verifyJWT, getMe);
router.put("/me", verifyJWT, updateMe);
router.post("/me/avatar", verifyJWT, upload.single("avatar"), uploadAvatar);
router.post("/me/resume", verifyJWT, upload.single("resume"), uploadResume);
router.get("/:userId", verifyJWT, getProfile);

export default router;
