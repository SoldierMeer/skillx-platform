import { z } from "zod";
import {
  DepartmentSchema,
  CampusHubSchema,
  SessionStatusSchema,
  RequestOtpSchema,
  VerifyOtpSchema,
  UpdateProfileSchema,
  SearchSkillsSchema,
  CreateBookingSchema,
  UpdateBookingStatusSchema,
  GetBookingsQuerySchema,
  SendMessageSchema,
  CreateReviewSchema,
  GetMessagesQuerySchema,
  VerifyQrPayloadSchema
} from "./schemas";

export type Department = z.infer<typeof DepartmentSchema>;
export type CampusHub = z.infer<typeof CampusHubSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type SearchSkillsQuery = z.infer<typeof SearchSkillsSchema>;
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>;
export type GetBookingsQuery = z.infer<typeof GetBookingsQuerySchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;
export type VerifyQrPayloadInput = z.infer<typeof VerifyQrPayloadSchema>;

export type TransactionType =
  | "promo_credit"
  | "escrow_lock"
  | "escrow_release"
  | "escrow_refund";

export type TransactionStatus = "pending" | "completed" | "failed";

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
  learner: string | UserProfile;
  tutor: string | UserProfile;
  skill: string;
  campusHub: CampusHub;
  scheduledTime: string | Date;
  durationHours: number;
  tokenCost: number;
  status: SessionStatus;
  verificationPin?: string;
  cancellationReason?: string;
  qrPayload?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TokenTransaction {
  id: string;
  transactionId: string;
  type: TransactionType;
  amount: number;
  fromUser?: string | UserProfile;
  toUser?: string | UserProfile;
  sessionId?: string;
  status: TransactionStatus;
  description?: string;
  createdAt: string;
}

export interface WalletSummary {
  tokenBalance: number;
  escrowBalance: number;
  totalEarned: number;
  totalSpent: number;
  recentTransactions: TokenTransaction[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

export interface PeerReview {
  id: string;
  sessionId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: number;
  feedback: string;
  tags?: string[];
  createdAt: string;
}

export interface QrPayload {
  sessionId: string;
  learnerId: string;
  timestamp: number;
  hash: string;
}

// Socket Event Payload Types
export interface JoinSessionPayload {
  sessionId: string;
}

export interface ChatMessagePayload {
  sessionId: string;
  content: string;
}

export interface TypingPayload {
  sessionId: string;
  isTyping: boolean;
}

export type NewMessageEvent = ChatMessage;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
