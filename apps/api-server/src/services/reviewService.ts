import mongoose from "mongoose";
import { CreateReviewInput, PeerReview, PaginatedResult } from "@skillx/shared-contracts";
import { Review, IReview } from "../models/Review";
import { Session } from "../models/Session";
import { User } from "../models/User";

export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewValidationError";
  }
}

export class ReviewConflictError extends Error {
  constructor(message = "You have already submitted a review for this session") {
    super(message);
    this.name = "ReviewConflictError";
  }
}

export async function createReview(
  reviewerId: string,
  input: CreateReviewInput
): Promise<PeerReview> {
  const session = await Session.findById(input.sessionId);
  if (!session) {
    throw new ReviewValidationError("Session not found");
  }

  // System Invariant 3: Reviews can only be submitted for 'completed' sessions
  if (session.status !== "completed") {
    throw new ReviewValidationError(
      `Reviews can only be submitted for completed sessions (current status: ${session.status})`
    );
  }

  const learnerId = session.learner.toString();
  const tutorId = session.tutor.toString();

  // Reviewer must be participant
  if (reviewerId !== learnerId && reviewerId !== tutorId) {
    throw new ReviewValidationError("Only participating students can review a completed session");
  }

  // Determine reviewee
  const revieweeId = reviewerId === learnerId ? tutorId : learnerId;

  // Check duplicate review
  const existingReview = await Review.findOne({
    session: session._id,
    reviewer: reviewerId
  });

  if (existingReview) {
    throw new ReviewConflictError("You have already submitted a review for this session");
  }

  const reviewerUser = await User.findById(reviewerId).select("name");
  if (!reviewerUser) {
    throw new ReviewValidationError("Reviewer not found");
  }

  const reviewDoc = await Review.create({
    session: session._id,
    reviewer: reviewerId,
    reviewee: revieweeId,
    rating: input.rating,
    feedback: input.feedback,
    tags: input.tags || []
  });

  // System Invariant 4: Atomic Rating Aggregation
  // newRating = ((oldRating * oldReviewCount) + incomingRating) / (oldReviewCount + 1)
  const reviewee = await User.findById(revieweeId);
  if (reviewee) {
    const oldRating = reviewee.rating || 5.0;
    const oldCount = reviewee.reviewCount || 0;
    const newCount = oldCount + 1;
    const rawNewRating = (oldRating * oldCount + input.rating) / newCount;
    const newRating = Number(rawNewRating.toFixed(2));

    reviewee.rating = newRating;
    reviewee.reviewCount = newCount;
    await reviewee.save();
  }

  return {
    id: reviewDoc._id.toString(),
    sessionId: input.sessionId,
    reviewerId,
    reviewerName: reviewerUser.name,
    revieweeId,
    rating: reviewDoc.rating,
    feedback: reviewDoc.feedback,
    tags: reviewDoc.tags,
    createdAt: reviewDoc.createdAt.toISOString()
  };
}

export async function getUserReviews(
  userId: string,
  page = 1,
  limit = 10
): Promise<PaginatedResult<PeerReview>> {
  const filter = { reviewee: new mongoose.Types.ObjectId(userId) };
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reviewer", "name"),
    Review.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  const data: PeerReview[] = docs.map((doc) => ({
    id: doc._id.toString(),
    sessionId: doc.session.toString(),
    reviewerId: doc.reviewer._id ? (doc.reviewer as any)._id.toString() : doc.reviewer.toString(),
    reviewerName: (doc.reviewer as any)?.name || "Anonymous Student",
    revieweeId: doc.reviewee.toString(),
    rating: doc.rating,
    feedback: doc.feedback,
    tags: doc.tags,
    createdAt: doc.createdAt.toISOString()
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages
  };
}
