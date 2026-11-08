import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMessage extends Document {
  session: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    readAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ session: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>("Message", messageSchema);
