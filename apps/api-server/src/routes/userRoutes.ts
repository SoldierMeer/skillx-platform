import { Router } from "express";
import { UpdateProfileSchema, SearchSkillsSchema } from "@skillx/shared-contracts";
import { updateProfile, searchSkills } from "../controllers/userController";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";

const router = Router();

router.put("/profile", authenticate, validate(UpdateProfileSchema, "body"), updateProfile);
router.get("/search", validate(SearchSkillsSchema, "query"), searchSkills);

export default router;
