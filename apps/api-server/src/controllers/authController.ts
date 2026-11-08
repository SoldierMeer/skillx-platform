import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  RequestOtpInput,
  VerifyOtpInput,
  UserProfile,
  AuthResponse
} from "@skillx/shared-contracts";
import { User, IUser } from "../models/User";
import {
  generateAndSendOtp,
  verifyOtp,
  OtpRateLimitError,
  OtpVerificationError
} from "../services/otpService";
import { env } from "../config/env";

export function formatUserProfile(user: IUser): UserProfile {
  return {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    department: user.department,
    bio: user.bio,
    skillsToTeach: user.skillsToTeach,
    skillsToLearn: user.skillsToLearn,
    tokenBalance: user.tokenBalance,
    escrowBalance: user.escrowBalance,
    rating: user.rating,
    reviewCount: user.reviewCount,
    campusHubPreference: user.campusHubPreference,
    isVerified: user.isVerified,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString()
  };
}

export async function requestOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, name, department }: RequestOtpInput = req.body;
    await generateAndSendOtp(email, name, department);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your Sukkur IBA email"
    });
  } catch (error: any) {
    if (error instanceof OtpRateLimitError) {
      res.status(429).json({
        error: "RateLimitExceeded",
        message: error.message
      });
      return;
    }

    console.error("[AuthController] requestOtp error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: "Failed to dispatch verification OTP"
    });
  }
}

export async function verifyOtpHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp }: VerifyOtpInput = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP code
    const verification = await verifyOtp(normalizedEmail, otp);

    let isNewUser = false;
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      isNewUser = true;
      user = await User.create({
        email: normalizedEmail,
        name: verification.name || normalizedEmail.split("@")[0],
        department: verification.department || "CS",
        isVerified: true,
        tokenBalance: 5, // System Invariant: Cold-Start Promo Economics
        escrowBalance: 0
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const accessToken = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        department: user.department
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    const authResponse: AuthResponse = {
      user: formatUserProfile(user),
      tokens: {
        accessToken,
        expiresIn: env.JWT_EXPIRES_IN
      },
      isNewUser
    };

    res.status(200).json(authResponse);
  } catch (error: any) {
    if (error instanceof OtpVerificationError) {
      res.status(400).json({
        error: "InvalidOtp",
        message: error.message
      });
      return;
    }

    console.error("[AuthController] verifyOtp error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: "Failed to verify OTP"
    });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: "NotFound", message: "User profile not found" });
      return;
    }

    res.status(200).json({
      success: true,
      user: formatUserProfile(user)
    });
  } catch (error: any) {
    console.error("[AuthController] getMe error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: "Failed to retrieve student profile"
    });
  }
}
