import express from "express"
import { requestOtp, verifyOtp } from "../controllers/authController";

const router = express.Router();

router.get("/auth/request-otp", requestOtp);
router.post("/auth/verify-otp", verifyOtp);

export default router;