import { z } from "zod";
import {
  DepartmentSchema,
  CampusHubSchema,
  SessionStatusSchema,
  RequestOtpSchema,
  VerifyOtpSchema,
  UpdateProfileSchema,
  SearchSkillsSchema
} from "./schemas";

export type Department = z.infer<typeof DepartmentSchema>;
export type CampusHub = z.infer<typeof CampusHubSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type SearchSkillsQuery = z.infer<typeof SearchSkillsSchema>;

export interface UserProfile {
  _id: string;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: string | number;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
  isNewUser: boolean;
}

export interface SessionBooking {
  _id: string;
  learnerId: string;
  tutorId: string;
  skill: string;
  campusHub: CampusHub;
  scheduledTime: string;
  tokenCost: number;
  status: SessionStatus;
  verificationPin?: string;
  qrPayload?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
