import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReview extends Document {
  session: Types.ObjectId;
  reviewer: Types.ObjectId;
  reviewee: Types.ObjectId;
  rating: number;
  feedback: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    reviewee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 500
    },
    tags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Enforce One-Review-Per-Completed-Session
reviewSchema.index({ session: 1, reviewer: 1 }, { unique: true });

export const Review = mongoose.model<IReview>("Review", reviewSchema);
