import { Router } from "express";
import { CreateReviewSchema } from "@skillx/shared-contracts";
import { createReviewHandler, getUserReviewsHandler } from "../controllers/reviewController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// Submit Review (Authenticated)
router.post("/", authenticate, validate(CreateReviewSchema, "body"), createReviewHandler);

// Public / Authenticated view of student reviews
router.get("/user/:userId", getUserReviewsHandler);

export default router;
