"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchSkillsSchema = exports.UpdateProfileSchema = exports.VerifyOtpSchema = exports.RequestOtpSchema = exports.SessionStatusSchema = exports.CampusHubSchema = exports.DepartmentSchema = exports.IbaEmailSchema = exports.SukkurIbaEmailRegex = void 0;
const zod_1 = require("zod");
exports.SukkurIbaEmailRegex = /^[a-zA-Z0-9._%+-]+@iba-suk\.edu\.pk$/;
exports.IbaEmailSchema = zod_1.z
    .string()
    .trim()
    .email("Invalid email address")
    .regex(exports.SukkurIbaEmailRegex, "Email must be a valid @iba-suk.edu.pk institutional email");
exports.DepartmentSchema = zod_1.z.enum([
    "CS",
    "BBA",
    "EE",
    "Mathematics",
    "Accounting & Finance"
]);
exports.CampusHubSchema = zod_1.z.enum([
    "Knowledge Center",
    "Academic Block III",
    "Student Center",
    "Academic Block I"
]);
exports.SessionStatusSchema = zod_1.z.enum([
    "pending",
    "accepted",
    "in_progress",
    "completed",
    "cancelled"
]);
exports.RequestOtpSchema = zod_1.z.object({
    email: exports.IbaEmailSchema,
    name: zod_1.z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name cannot exceed 60 characters"),
    department: exports.DepartmentSchema
});
exports.VerifyOtpSchema = zod_1.z.object({
    email: exports.IbaEmailSchema,
    otp: zod_1.z.string().trim().regex(/^\d{6}$/, "OTP must be exactly 6 digits")
});
exports.UpdateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(60).optional(),
    bio: zod_1.z.string().trim().max(300, "Bio cannot exceed 300 characters").optional(),
    skillsToTeach: zod_1.z.array(zod_1.z.string().trim().min(1)).min(1, "At least 1 skill required").max(10, "Maximum 10 skills allowed").optional(),
    skillsToLearn: zod_1.z.array(zod_1.z.string().trim().min(1)).min(1, "At least 1 skill required").max(10, "Maximum 10 skills allowed").optional(),
    campusHubPreference: exports.CampusHubSchema.optional()
});
exports.SearchSkillsSchema = zod_1.z.object({
    q: zod_1.z.string().trim().optional(),
    department: exports.DepartmentSchema.optional(),
    type: zod_1.z.enum(["teach", "learn"]).default("teach"),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(12)
});
