import crypto from "crypto";
import mongoose from "mongoose";
import {
  CreateBookingInput,
  UpdateBookingStatusInput,
  GetBookingsQuery,
  PaginatedResult,
  SessionBooking
} from "@skillx/shared-contracts";
import { Session, ISession } from "../models/Session";
import { User } from "../models/User";
import {
  lockTokensInEscrow,
  releaseEscrowToTutor,
  refundEscrowToLearner
} from "./walletService";

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

export class BookingNotFoundError extends Error {
  constructor(message = "Session booking not found") {
    super(message);
    this.name = "BookingNotFoundError";
  }
}

export class UnauthorizedBookingActionError extends Error {
  constructor(message = "Unauthorized to perform this booking action") {
    super(message);
    this.name = "UnauthorizedBookingActionError";
  }
}

export async function createBooking(
  learnerId: string,
  input: CreateBookingInput
): Promise<ISession> {
  // Anti-Self Trading Invariant
  if (learnerId === input.tutorId) {
    throw new BookingValidationError("Self-trading prohibited: You cannot book a skill session with yourself.");
  }

  const tutor = await User.findById(input.tutorId);
  if (!tutor) {
    throw new BookingNotFoundError("Tutor not found.");
  }

  if (!tutor.isVerified) {
    throw new BookingValidationError("Tutor must be a verified student at Sukkur IBA University.");
  }

  const tokenCost = input.durationHours || 1;

  // Multi-Document ACID Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [newBooking] = await Session.create(
      [
        {
          learner: new mongoose.Types.ObjectId(learnerId),
          tutor: new mongoose.Types.ObjectId(input.tutorId),
          skill: input.skill,
          campusHub: input.campusHub,
          scheduledTime: input.scheduledTime,
          durationHours: input.durationHours || 1,
          tokenCost,
          status: "pending"
        }
      ],
      { session }
    );

    // Atomically lock tokens in escrow
    await lockTokensInEscrow(learnerId, tokenCost, newBooking._id, session);

    await session.commitTransaction();
    return newBooking;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function updateBookingStatus(
  userId: string,
  sessionId: string,
  input: UpdateBookingStatusInput
): Promise<ISession> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Session.findById(sessionId).session(session);
    if (!booking) {
      throw new BookingNotFoundError();
    }

    const learnerIdStr = booking.learner.toString();
    const tutorIdStr = booking.tutor.toString();

    switch (input.action) {
      case "accept": {
        // Only tutor can accept
        if (userId !== tutorIdStr) {
          throw new UnauthorizedBookingActionError("Only the assigned tutor can accept this session booking.");
        }
        if (booking.status !== "pending") {
          throw new BookingValidationError(`Cannot accept booking in current status: ${booking.status}`);
        }

        // Generate 4-digit mutual verification PIN
        const pin = crypto.randomInt(1000, 10000).toString();
        booking.status = "accepted";
        booking.verificationPin = pin;
        await booking.save({ session });
        break;
      }

      case "reject": {
        // Only tutor can reject
        if (userId !== tutorIdStr) {
          throw new UnauthorizedBookingActionError("Only the assigned tutor can reject this session booking.");
        }
        if (booking.status !== "pending") {
          throw new BookingValidationError(`Cannot reject booking in current status: ${booking.status}`);
        }

        booking.status = "rejected";
        booking.cancellationReason = input.reason || "Rejected by tutor";
        await booking.save({ session });

        // 100% instant refund to learner
        await refundEscrowToLearner(
          booking.learner,
          booking.tokenCost,
          booking._id,
          booking.cancellationReason,
          session
        );
        break;
      }

      case "cancel": {
        // Either learner or tutor can cancel
        if (userId !== learnerIdStr && userId !== tutorIdStr) {
          throw new UnauthorizedBookingActionError("Only participating students can cancel this session booking.");
        }
        if (booking.status !== "pending" && booking.status !== "accepted") {
          throw new BookingValidationError(`Cannot cancel booking in current status: ${booking.status}`);
        }

        booking.status = "cancelled";
        booking.cancellationReason = input.reason || `Cancelled by ${userId === learnerIdStr ? "learner" : "tutor"}`;
        await booking.save({ session });

        // 100% instant refund to learner
        await refundEscrowToLearner(
          booking.learner,
          booking.tokenCost,
          booking._id,
          booking.cancellationReason,
          session
        );
        break;
      }

      case "complete": {
        // Tutor initiates completion by entering the physical handshake PIN given by learner
        if (userId !== tutorIdStr) {
          throw new UnauthorizedBookingActionError("Only the tutor can submit the verification PIN to complete the session.");
        }
        if (booking.status !== "accepted" && booking.status !== "in_progress") {
          throw new BookingValidationError(`Cannot complete booking in current status: ${booking.status}`);
        }

        if (!input.verificationPin) {
          throw new BookingValidationError("4-digit campus handshake PIN is required to complete session.");
        }

        if (input.verificationPin.trim() !== booking.verificationPin) {
          throw new BookingValidationError("Invalid verification PIN. Physical handshake verification failed.");
        }

        booking.status = "completed";
        await booking.save({ session });

        // Atomic escrow release to tutor
        await releaseEscrowToTutor(
          booking.learner,
          booking.tutor,
          booking.tokenCost,
          booking._id,
          session
        );
        break;
      }

      default:
        throw new BookingValidationError(`Unsupported booking action: ${(input as any).action}`);
    }

    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function listBookings(
  userId: string,
  query: GetBookingsQuery
): Promise<PaginatedResult<SessionBooking>> {
  const { role = "all", status, page = 1, limit = 10 } = query;
  const userObjId = new mongoose.Types.ObjectId(userId);

  const filter: Record<string, any> = {};

  if (role === "learner") {
    filter.learner = userObjId;
  } else if (role === "tutor") {
    filter.tutor = userObjId;
  } else {
    filter.$or = [{ learner: userObjId }, { tutor: userObjId }];
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Session.find(filter)
      .sort({ scheduledTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("learner", "name email department rating")
      .populate("tutor", "name email department rating"),
    Session.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  const data: SessionBooking[] = docs.map((doc) => {
    const isLearner = doc.learner._id
      ? doc.learner._id.toString() === userId
      : doc.learner.toString() === userId;

    return {
      _id: doc._id.toString(),
      learner: doc.learner as any,
      tutor: doc.tutor as any,
      skill: doc.skill,
      campusHub: doc.campusHub,
      scheduledTime: doc.scheduledTime.toISOString(),
      durationHours: doc.durationHours,
      tokenCost: doc.tokenCost,
      status: doc.status,
      // Verification PIN is only visible to the Learner (or when completed)
      verificationPin: isLearner || doc.status === "completed" ? doc.verificationPin : undefined,
      cancellationReason: doc.cancellationReason,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString()
    };
  });

  return {
    data,
    total,
    page,
    limit,
    totalPages
  };
}

export async function getBookingById(
  userId: string,
  sessionId: string
): Promise<SessionBooking> {
  const doc = await Session.findById(sessionId)
    .populate("learner", "name email department rating")
    .populate("tutor", "name email department rating");

  if (!doc) {
    throw new BookingNotFoundError();
  }

  const learnerId = doc.learner._id ? doc.learner._id.toString() : doc.learner.toString();
  const tutorId = doc.tutor._id ? doc.tutor._id.toString() : doc.tutor.toString();

  if (userId !== learnerId && userId !== tutorId) {
    throw new UnauthorizedBookingActionError("You do not have access to view this session booking.");
  }

  const isLearner = userId === learnerId;

  return {
    _id: doc._id.toString(),
    learner: doc.learner as any,
    tutor: doc.tutor as any,
    skill: doc.skill,
    campusHub: doc.campusHub,
    scheduledTime: doc.scheduledTime.toISOString(),
    durationHours: doc.durationHours,
    tokenCost: doc.tokenCost,
    status: doc.status,
    verificationPin: isLearner || doc.status === "completed" ? doc.verificationPin : undefined,
    cancellationReason: doc.cancellationReason,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString()
  };
}
