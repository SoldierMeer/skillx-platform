import mongoose, { Document, Schema } from "mongoose";
import { Department, DepartmentSchema, CampusHub, CampusHubSchema } from "@skillx/shared-contracts";

export interface IUser extends Document {
  email: string;
  name: string;
  department: Department;
  bio?: string;
  skillsToTeach: string[];
  skillsToLearn: string[];
  tokenBalance: number;
  escrowBalance: number;
  rating: number;
  reviewCount: number;
  campusHubPreference?: CampusHub;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      enum: DepartmentSchema.options,
      index: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },
    skillsToTeach: {
      type: [String],
      default: []
    },
    skillsToLearn: {
      type: [String],
      default: []
    },
    tokenBalance: {
      type: Number,
      required: true,
      default: 5
    },
    escrowBalance: {
      type: Number,
      required: true,
      default: 0
    },
    rating: {
      type: Number,
      default: 5.0
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    campusHubPreference: {
      type: String,
      enum: CampusHubSchema.options,
      required: false
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.index(
  {
    skillsToTeach: "text",
    skillsToLearn: "text",
    name: "text",
    bio: "text"
  },
  {
    weights: {
      skillsToTeach: 10,
      skillsToLearn: 5,
      name: 3,
      bio: 1
    },
    name: "UserTextSearchIndex"
  }
);

export const User = mongoose.model<IUser>("User", userSchema);
