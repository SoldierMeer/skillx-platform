import { Request, Response } from "express";
import { CreateReviewInput } from "@skillx/shared-contracts";
import {
  createReview,
  getUserReviews,
  ReviewValidationError,
  ReviewConflictError
} from "../services/reviewService";

export async function createReviewHandler(req: Request, res: Response): Promise<void> {
  try {
    const reviewerId = req.user?.id;
    if (!reviewerId) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const input: CreateReviewInput = req.body;
    const review = await createReview(reviewerId, input);

    res.status(201).json({
      success: true,
      message: "Peer review submitted and tutor rating updated successfully",
      data: review
    });
  } catch (error: any) {
    if (error instanceof ReviewValidationError) {
      res.status(400).json({ error: "ValidationError", message: error.message });
      return;
    }
    if (error instanceof ReviewConflictError) {
      res.status(409).json({ error: "Conflict", message: error.message });
      return;
    }

    console.error("[ReviewController] createReview error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message || "Failed to submit review"
    });
  }
}

export async function getUserReviewsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const result = await getUserReviews(userId, page, limit);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("[ReviewController] getUserReviews error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message || "Failed to retrieve user reviews"
    });
  }
}
