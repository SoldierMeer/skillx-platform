import mongoose, { Document, Schema, Types } from "mongoose";
import { CampusHub, CampusHubSchema, SessionStatus, SessionStatusSchema } from "@skillx/shared-contracts";

export interface ISession extends Document {
  learner: Types.ObjectId;
  tutor: Types.ObjectId;
  skill: string;
  campusHub: CampusHub;
  scheduledTime: Date;
  durationHours: number;
  tokenCost: number;
  status: SessionStatus;
  verificationPin?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    learner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    tutor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    skill: {
      type: String,
      required: true,
      trim: true
    },
    campusHub: {
      type: String,
      required: true,
      enum: CampusHubSchema.options
    },
    scheduledTime: {
      type: Date,
      required: true
    },
    durationHours: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      max: 3
    },
    tokenCost: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    status: {
      type: String,
      required: true,
      enum: SessionStatusSchema.options,
      default: "pending",
      index: true
    },
    verificationPin: {
      type: String,
      trim: true
    },
    cancellationReason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const Session = mongoose.model<ISession>("Session", sessionSchema);
