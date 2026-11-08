import { Request, Response } from "express";
import {
  CreateBookingInput,
  UpdateBookingStatusInput,
  GetBookingsQuery
} from "@skillx/shared-contracts";
import {
  createBooking,
  updateBookingStatus,
  listBookings,
  getBookingById,
  BookingValidationError,
  BookingNotFoundError,
  UnauthorizedBookingActionError
} from "../services/bookingService";
import { InsufficientBalanceError } from "../services/walletService";

export async function createBookingHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const input: CreateBookingInput = req.body;
    const booking = await createBooking(userId, input);

    res.status(201).json({
      success: true,
      message: "Session booking created and tokens locked in escrow",
      data: booking
    });
  } catch (error: any) {
    if (error instanceof BookingValidationError || error instanceof InsufficientBalanceError) {
      res.status(400).json({
        error: error.name,
        message: error.message
      });
      return;
    }
    if (error instanceof BookingNotFoundError) {
      res.status(404).json({
        error: "NotFound",
        message: error.message
      });
      return;
    }

    console.error("[BookingController] createBooking error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message || "Failed to create session booking"
    });
  }
}

export async function listBookingsHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const query = req.query as unknown as GetBookingsQuery;
    const result = await listBookings(userId, query);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("[BookingController] listBookings error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: "Failed to retrieve session bookings"
    });
  }
}

export async function getBookingByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const sessionId = req.params.id;
    const session = await getBookingById(userId, sessionId);

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error: any) {
    if (error instanceof BookingNotFoundError) {
      res.status(404).json({ error: "NotFound", message: error.message });
      return;
    }
    if (error instanceof UnauthorizedBookingActionError) {
      res.status(403).json({ error: "Forbidden", message: error.message });
      return;
    }

    console.error("[BookingController] getBookingById error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: "Failed to retrieve booking"
    });
  }
}

export async function updateBookingStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const sessionId = req.params.id;
    const input: UpdateBookingStatusInput = req.body;
    const updated = await updateBookingStatus(userId, sessionId, input);

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${updated.status}`,
      data: updated
    });
  } catch (error: any) {
    if (error instanceof BookingValidationError) {
      res.status(400).json({ error: "ValidationError", message: error.message });
      return;
    }
    if (error instanceof BookingNotFoundError) {
      res.status(404).json({ error: "NotFound", message: error.message });
      return;
    }
    if (error instanceof UnauthorizedBookingActionError) {
      res.status(403).json({ error: "Forbidden", message: error.message });
      return;
    }

    console.error("[BookingController] updateBookingStatus error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: error.message || "Failed to update booking status"
    });
  }
}
