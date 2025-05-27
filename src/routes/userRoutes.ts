import express from "express";
import { authenticate } from "../middleware/authMiddleware";
import * as postController from "../controllers/postController";
import upload from "../middleware/uploadsMiddleware";
import { uploadPicture } from "../controllers/userControllers";
import * as userControllers from "../controllers/userControllers";

const router = express.Router();

router.post("/user/upload-photo",authenticate, upload.single("photo"), uploadPicture);
router.post("/createUser", userControllers.createUser);
router.get("/users", userControllers.getUsers);
router.post("/create-post", authenticate,upload.single("image"), postController.createPost);
router.put("/posts/:id", authenticate, postController.updatePost);
router.delete("/posts/:id", authenticate, postController.deletePost);
router.get("/posts", postController.getPosts); // public or protected, your choice

export default router;
