import express from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import chatRoutes from "./chatRoutes";
import eventRoutes from "./eventRoutes";

const router = express.Router();

router.use(authRoutes);
router.use(userRoutes);
router.use(chatRoutes);
router.use(eventRoutes);

export default router;