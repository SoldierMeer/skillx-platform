import { Router } from "express";
import { RequestOtpSchema, VerifyOtpSchema } from "@skillx/shared-contracts";
import { requestOtp, verifyOtpHandler, getMe } from "../controllers/authController";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/request-otp", validate(RequestOtpSchema, "body"), requestOtp);
router.post("/verify-otp", validate(VerifyOtpSchema, "body"), verifyOtpHandler);
router.get("/me", authenticate, getMe);

export default router;
