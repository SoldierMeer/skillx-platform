import mongoose, { Document, Schema } from "mongoose";
import { Department, DepartmentSchema } from "@skillx/shared-contracts";

export interface IOtpToken extends Document {
  email: string;
  otpHash: string;
  name?: string;
  department?: Department;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpTokenSchema = new Schema<IOtpToken>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      enum: DepartmentSchema.options
    },
    attempts: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically purge expired tokens
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpToken = mongoose.model<IOtpToken>("OtpToken", otpTokenSchema);
