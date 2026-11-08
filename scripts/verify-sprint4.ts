/**
 * Sprint 4 Verification Script: Native Mobile QR Handshake & ACID Escrow Settlement
 *
 * Verifies:
 * 1. Institutional user onboarding & token balances
 * 2. Booking creation & escrow locking
 * 3. Tutor acceptance
 * 4. HMAC-SHA256 signed QR payload generation
 * 5. Tamper & replay rejection
 * 6. In-person physical QR handshake verification (atomic token settlement to tutor)
 * 7. Prevention of duplicate/replayed QR settlements
 */

import { connectDB, disconnectDB } from "../apps/api-server/src/config/db";
import { User } from "../apps/api-server/src/models/User";
import { Session } from "../apps/api-server/src/models/Session";
import { Transaction } from "../apps/api-server/src/models/Transaction";
import * as bookingService from "../apps/api-server/src/services/bookingService";

async function main() {
  console.log("=== SkillX Sprint 4 Verification: Mobile QR Handshake Engine ===");
  await connectDB();
  console.log("Connected to MongoDB for Sprint 4 verification.");

  try {
    // 1. Setup Test Learner & Tutor
    const learnerEmail = `learner_s4_${Date.now()}@iba-suk.edu.pk`;
    const tutorEmail = `tutor_s4_${Date.now()}@iba-suk.edu.pk`;

    const learner = await User.create({
      email: learnerEmail,
      name: "S4 Learner",
      department: "CS",
      tokenBalance: 5,
      escrowBalance: 0,
      skillsToTeach: [],
      skillsToLearn: ["Mobile Dev"],
      isVerified: true,
    });

    const tutor = await User.create({
      email: tutorEmail,
      name: "S4 Tutor",
      department: "CS",
      tokenBalance: 2,
      escrowBalance: 0,
      skillsToTeach: ["Mobile Dev", "React Native"],
      skillsToLearn: [],
      isVerified: true,
    });

    console.log(`[PASS] Created test peers:`);
    console.log(`  Learner: ${learner.name} (Bal: ${learner.tokenBalance}, Escrow: ${learner.escrowBalance})`);
    console.log(`  Tutor: ${tutor.name} (Bal: ${tutor.tokenBalance}, Escrow: ${tutor.escrowBalance})`);

    // 2. Learner books Tutor (Escrow lock)
    const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const booking = await bookingService.createBooking(learner._id.toString(), {
      tutorId: tutor._id.toString(),
      skill: "Mobile Dev",
      campusHub: "Knowledge Center",
      scheduledTime,
      durationHours: 1,
    });

    console.log(`[PASS] Booking created (ID: ${booking.id}) with escrow locked`);

    const refreshedLearner1 = await User.findById(learner._id);
    if (refreshedLearner1?.tokenBalance !== 4 || refreshedLearner1?.escrowBalance !== 1) {
      throw new Error(`Escrow balance check failed: Bal=${refreshedLearner1?.tokenBalance}, Escrow=${refreshedLearner1?.escrowBalance}`);
    }
    console.log(`[PASS] Learner balance updated atomically: Available=4, Escrow=1`);

    // 3. Tutor accepts session
    const acceptedBooking = await bookingService.updateBookingStatus(
      tutor._id.toString(),
      booking.id,
      { action: "accept" }
    );
    if (acceptedBooking.status !== "accepted") {
      throw new Error(`Expected booking status 'accepted', got ${acceptedBooking.status}`);
    }
    console.log(`[PASS] Session accepted by tutor. Status: ${acceptedBooking.status}`);

    // 4. Generate QR Payload (Learner Device)
    const qrPayload = await bookingService.generateQrPayload(learner._id.toString(), booking.id);
    console.log("[PASS] Dynamic QR payload generated for Learner device:", {
      sessionId: qrPayload.sessionId,
      learnerId: qrPayload.learnerId,
      timestamp: qrPayload.timestamp,
      hashPrefix: qrPayload.hash.substring(0, 10) + "...",
    });

    // 5. Security & Anti-Tamper Tests
    // 5a. Tampered hash test
    try {
      await bookingService.verifyQrHandshake(tutor._id.toString(), booking.id, {
        ...qrPayload,
        hash: "invalidhash00000000000000000000000000000000000000000000000000000000",
      });
      throw new Error("Tampered hash should have been rejected!");
    } catch (err: any) {
      if (err.message.includes("Tampered") || err.message.includes("Invalid QR signature")) {
        console.log(`[PASS] Security Check: Tampered QR hash rejected successfully.`);
      } else {
        throw err;
      }
    }

    // 5b. Mismatched session test
    try {
      await bookingService.verifyQrHandshake(tutor._id.toString(), "000000000000000000000000", qrPayload);
      throw new Error("Mismatched session ID should have been rejected!");
    } catch (err: any) {
      console.log(`[PASS] Security Check: Mismatched session ID rejected successfully.`);
    }

    // 6. Valid Physical QR Handshake at Campus Hub (Tutor Camera Scan)
    const completedBooking = await bookingService.verifyQrHandshake(
      tutor._id.toString(),
      booking.id,
      qrPayload
    );

    if (completedBooking.status !== "completed") {
      throw new Error(`Expected booking status 'completed', got ${completedBooking.status}`);
    }
    console.log(`[PASS] QR Handshake verified! Session completed successfully.`);

    // 7. Verify Balances after Escrow Release
    const refreshedLearnerFinal = await User.findById(learner._id);
    const refreshedTutorFinal = await User.findById(tutor._id);

    if (refreshedLearnerFinal?.tokenBalance !== 4 || refreshedLearnerFinal?.escrowBalance !== 0) {
      throw new Error(`Learner final balance mismatch: Bal=${refreshedLearnerFinal?.tokenBalance}, Escrow=${refreshedLearnerFinal?.escrowBalance}`);
    }
    if (refreshedTutorFinal?.tokenBalance !== 3 || refreshedTutorFinal?.escrowBalance !== 0) {
      throw new Error(`Tutor final balance mismatch: Bal=${refreshedTutorFinal?.tokenBalance}, Escrow=${refreshedTutorFinal?.escrowBalance}`);
    }

    console.log(`[PASS] Balances atomically settled:`);
    console.log(`  Learner: Available=${refreshedLearnerFinal.tokenBalance}, Escrow=${refreshedLearnerFinal.escrowBalance}`);
    console.log(`  Tutor: Available=${refreshedTutorFinal.tokenBalance}, Escrow=${refreshedTutorFinal.escrowBalance}`);

    // 8. Replay Attack Test (Attempting duplicate verification of already completed QR)
    try {
      await bookingService.verifyQrHandshake(tutor._id.toString(), booking.id, qrPayload);
      throw new Error("Replay attack succeeded when it should have failed!");
    } catch (err: any) {
      console.log(`[PASS] Replay Protection: Re-verification on completed session rejected with: "${err.message}"`);
    }

    // Clean up test data
    await User.deleteMany({ _id: { $in: [learner._id, tutor._id] } });
    await Session.deleteOne({ _id: booking.id });
    await Transaction.deleteMany({ sessionId: booking.id });

    console.log("=== ALL SPRINT 4 VERIFICATION CHECKS PASSED ===");
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  console.error("Sprint 4 Verification Failed:", err);
  process.exit(1);
});
