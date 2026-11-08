import { z } from "zod";

export const SukkurIbaEmailRegex = /^[a-zA-Z0-9._%+-]+@iba-suk\.edu\.pk$/;

export const IbaEmailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .regex(SukkurIbaEmailRegex, "Email must be a valid @iba-suk.edu.pk institutional email");

export const DepartmentSchema = z.enum([
  "CS",
  "BBA",
  "EE",
  "Mathematics",
  "Accounting & Finance"
]);

export const CampusHubSchema = z.enum([
  "Knowledge Center",
  "Academic Block III",
  "Student Center",
  "Academic Block I"
]);

export const SessionStatusSchema = z.enum([
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "rejected"
]);

export const RequestOtpSchema = z.object({
  email: IbaEmailSchema,
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name cannot exceed 60 characters"),
  department: DepartmentSchema
});

export const VerifyOtpSchema = z.object({
  email: IbaEmailSchema,
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be exactly 6 digits")
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  bio: z.string().trim().max(300, "Bio cannot exceed 300 characters").optional(),
  skillsToTeach: z.array(z.string().trim().min(1)).min(1, "At least 1 skill required").max(10, "Maximum 10 skills allowed").optional(),
  skillsToLearn: z.array(z.string().trim().min(1)).min(1, "At least 1 skill required").max(10, "Maximum 10 skills allowed").optional(),
  campusHubPreference: CampusHubSchema.optional()
});

export const SearchSkillsSchema = z.object({
  q: z.string().trim().optional(),
  department: DepartmentSchema.optional(),
  type: z.enum(["teach", "learn"]).default("teach"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
});

export const CreateBookingSchema = z.object({
  tutorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tutor ID format"),
  skill: z.string().trim().min(2, "Skill must be at least 2 characters").max(50, "Skill cannot exceed 50 characters"),
  campusHub: CampusHubSchema,
  scheduledTime: z.coerce.date().refine((d) => d > new Date(), "Session must be scheduled in the future"),
  durationHours: z.number().int().min(1).max(3).default(1)
});

export const UpdateBookingStatusSchema = z.object({
  action: z.enum(["accept", "reject", "cancel", "complete"]),
  verificationPin: z.string().length(4, "PIN must be exactly 4 digits").regex(/^\d{4}$/, "PIN must be numeric").optional(),
  reason: z.string().max(200, "Reason cannot exceed 200 characters").optional()
});

export const GetBookingsQuerySchema = z.object({
  role: z.enum(["learner", "tutor", "all"]).default("all"),
  status: SessionStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10)
});
