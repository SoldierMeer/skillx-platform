import mongoose, { Document, Schema, Types } from "mongoose";
import { TransactionType, TransactionStatus } from "@skillx/shared-contracts";

export interface ITransaction extends Document {
  transactionId: string;
  type: TransactionType;
  amount: number;
  fromUser?: Types.ObjectId;
  toUser?: Types.ObjectId;
  session?: Types.ObjectId;
  status: TransactionStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: ["promo_credit", "escrow_lock", "escrow_release", "escrow_refund"],
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "completed", "failed"],
      default: "completed"
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema);
