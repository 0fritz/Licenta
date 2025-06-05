import express from "express";
import { authenticate } from "../middleware/authMiddleware";
import * as postController from "../controllers/postController";
import {upload} from "../middleware/uploadsMiddleware";
import { uploadProfilePicture, uploadCoverImage, deleteUserImage, getUserImages, uploadGalleryImage, sendFriendRequest, respondToFriendRequest, getPendingFriendRequests, getUserProfiles, getFriends } from "../controllers/userControllers";
import { addUserTag, getUserProfile, removeUserTag, updateUserProfile, uploadPicture } from "../controllers/userControllers";
import { downloadImage } from "../controllers/userControllers";
import { getUserEvents } from "../controllers/eventsController";

const router = express.Router();

// router.post("/user/upload-photo",authenticate, upload.single("photo"), uploadPicture);
// router.post("/create-post", authenticate,upload.single("image"), postController.createPost);
// router.put("/posts/:id", authenticate, postController.updatePost);
// router.delete("/posts/:id", authenticate, postController.deletePost);
// router.get("/posts", postController.getPosts); // public or protected, your choice

//User routes
router.get("/users/:id", getUserProfile); // public
router.get("/users", getUserProfiles); // public
router.put("/users/:id", authenticate, updateUserProfile); // protected
router.post("/users/:id/tags", authenticate, addUserTag);  // protected
router.delete("/users/:id/tags/:tag", authenticate, removeUserTag);
router.post("/users/:id/profile-picture", authenticate, upload.single("image"), uploadProfilePicture);
router.post("/users/:id/cover-image", authenticate, upload.single("image"), uploadCoverImage);
router.post("/upload-picture", authenticate, upload.single("image"), uploadPicture);


router.post("/users/:id/images", authenticate, upload.single("image"), uploadGalleryImage);
router.get("/users/:id/images", getUserImages);
router.delete("/images/:imageId", authenticate, deleteUserImage);
router.get("/users/:id/events", getUserEvents);

//FRIENDS

router.post('/friendships/request',authenticate, sendFriendRequest);
router.post('/friendships/respond',authenticate, respondToFriendRequest);
router.get('/friendships/pending', authenticate, getPendingFriendRequests);
router.get("/friendships/:id",authenticate, getFriends);



export default router;
