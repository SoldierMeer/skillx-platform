import { Router } from "express";
import { UpdateProfileSchema, SearchSkillsSchema } from "@skillx/shared-contracts";
import { updateProfile, searchSkills } from "../controllers/userController";
import { getUserReviewsHandler } from "../controllers/reviewController";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";

const router = Router();

router.put("/profile", authenticate, validate(UpdateProfileSchema, "body"), updateProfile);
router.get("/search", validate(SearchSkillsSchema, "query"), searchSkills);
router.get("/:userId/reviews", getUserReviewsHandler);

export default router;
