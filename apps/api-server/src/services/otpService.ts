import crypto from "crypto";
import { Department } from "@skillx/shared-contracts";
import { OtpToken } from "../models/OtpToken";
import { sendOtpEmail } from "./emailService";

export class OtpRateLimitError extends Error {
  constructor(message = "Please wait at least 60 seconds before requesting a new OTP") {
    super(message);
    this.name = "OtpRateLimitError";
  }
}

export class OtpVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpVerificationError";
  }
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function generateAndSendOtp(
  email: string,
  name: string,
  department?: Department
): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limiting: check if token was created within the last 60 seconds
  const recentToken = await OtpToken.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
  if (recentToken) {
    const elapsedSeconds = (Date.now() - new Date(recentToken.createdAt).getTime()) / 1000;
    if (elapsedSeconds < 60) {
      const waitTime = Math.ceil(60 - elapsedSeconds);
      throw new OtpRateLimitError(`Please wait ${waitTime} seconds before requesting a new OTP.`);
    }
  }

  // Cryptographic 6-digit numeric OTP (100000 to 999999 inclusive)
  const plainOtp = crypto.randomInt(100000, 1000000).toString();
  const hashed = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10-minute TTL

  // Invalidate any older tokens for this email
  await OtpToken.deleteMany({ email: normalizedEmail });

  // Store new OTP
  await OtpToken.create({
    email: normalizedEmail,
    otpHash: hashed,
    name,
    department,
    attempts: 0,
    expiresAt
  });

  // Dispatch email
  await sendOtpEmail({ email: normalizedEmail, name, otp: plainOtp });

  return plainOtp;
}

export interface VerifyOtpResult {
  valid: boolean;
  name?: string;
  department?: Department;
}

export async function verifyOtp(email: string, plainOtp: string): Promise<VerifyOtpResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const tokenDoc = await OtpToken.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });

  if (!tokenDoc) {
    throw new OtpVerificationError("No active OTP found. Please request a new OTP.");
  }

  if (new Date() > tokenDoc.expiresAt) {
    await OtpToken.deleteOne({ _id: tokenDoc._id });
    throw new OtpVerificationError("OTP has expired. Please request a new one.");
  }

  if (tokenDoc.attempts >= 5) {
    await OtpToken.deleteOne({ _id: tokenDoc._id });
    throw new OtpVerificationError("Maximum verification attempts exceeded. Please request a new OTP.");
  }

  const computedHash = hashOtp(plainOtp.trim());
  const hashBuffer = Buffer.from(computedHash, "utf8");
  const storedBuffer = Buffer.from(tokenDoc.otpHash, "utf8");

  const isMatch =
    hashBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(hashBuffer, storedBuffer);

  if (!isMatch) {
    tokenDoc.attempts += 1;
    await tokenDoc.save();
    const remaining = 5 - tokenDoc.attempts;
    throw new OtpVerificationError(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempts remaining.`
        : "Invalid OTP. Maximum verification attempts reached."
    );
  }

  const result: VerifyOtpResult = {
    valid: true,
    name: tokenDoc.name,
    department: tokenDoc.department
  };

  // Successfully matched - delete token document
  await OtpToken.deleteOne({ _id: tokenDoc._id });
  return result;
}
