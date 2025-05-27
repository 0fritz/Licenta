import express from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import chatRoutes from "./chatRoutes";

const router = express.Router();

router.use(authRoutes);
router.use(userRoutes);
router.use(chatRoutes);

export default router;