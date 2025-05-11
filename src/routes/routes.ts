import express from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";

const router = express.Router();

router.use(authRoutes);
router.use(userRoutes);

export default router;