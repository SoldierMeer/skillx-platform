import { Router } from "express";
import { getSessionMessagesHandler, sendMessageHandler } from "../controllers/chatController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/:sessionId/messages", getSessionMessagesHandler);
router.post("/:sessionId/messages", sendMessageHandler);

export default router;
