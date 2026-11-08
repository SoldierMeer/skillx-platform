import { Router } from "express";
import {
  CreateBookingSchema,
  UpdateBookingStatusSchema,
  GetBookingsQuerySchema
} from "@skillx/shared-contracts";
import {
  createBookingHandler,
  listBookingsHandler,
  getBookingByIdHandler,
  updateBookingStatusHandler
} from "../controllers/bookingController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authenticate);

router.post("/", validate(CreateBookingSchema, "body"), createBookingHandler);
router.get("/", validate(GetBookingsQuerySchema, "query"), listBookingsHandler);
router.get("/:id", getBookingByIdHandler);
router.patch("/:id/status", validate(UpdateBookingStatusSchema, "body"), updateBookingStatusHandler);

export default router;
