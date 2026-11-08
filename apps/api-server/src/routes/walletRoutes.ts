import { Router } from "express";
import { getWalletSummaryHandler } from "../controllers/walletController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/", getWalletSummaryHandler);

export default router;
