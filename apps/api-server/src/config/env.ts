import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/skillx"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").default("skillx-sukkur-iba-secret-key-2026-auth"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("SkillX <no-reply@iba-suk.edu.pk>")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
