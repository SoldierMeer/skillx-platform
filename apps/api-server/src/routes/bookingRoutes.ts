import { Router } from "express";
import {
  CreateBookingSchema,
  UpdateBookingStatusSchema,
  GetBookingsQuerySchema,
  VerifyQrPayloadSchema
} from "@skillx/shared-contracts";
import {
  createBookingHandler,
  listBookingsHandler,
  getBookingByIdHandler,
  updateBookingStatusHandler,
  getQrPayloadHandler,
  verifyQrHandler
} from "../controllers/bookingController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

router.post("/", validate(CreateBookingSchema, "body"), createBookingHandler);
router.get("/", validate(GetBookingsQuerySchema, "query"), listBookingsHandler);
router.get("/:id", getBookingByIdHandler);
router.patch("/:id/status", validate(UpdateBookingStatusSchema, "body"), updateBookingStatusHandler);

// QR Code Handshake Endpoints
router.get("/:id/qr-payload", getQrPayloadHandler);
router.post("/:id/verify-qr", validate(VerifyQrPayloadSchema, "body"), verifyQrHandler);

export default router;
