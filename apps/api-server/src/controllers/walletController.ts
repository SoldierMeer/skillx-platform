import { Request, Response } from "express";
import { getWalletSummary } from "../services/walletService";

export async function getWalletSummaryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const summary = await getWalletSummary(userId);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error("[WalletController] getWalletSummary error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message || "Failed to retrieve wallet summary"
    });
  }
}
