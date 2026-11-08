import http from "http";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { app } from "../apps/api-server/src/server";
import { connectDB, disconnectDB } from "../apps/api-server/src/config/db";
import { env } from "../apps/api-server/src/config/env";
import { User } from "../apps/api-server/src/models/User";
import { Session } from "../apps/api-server/src/models/Session";
import { Transaction } from "../apps/api-server/src/models/Transaction";
import { lockTokensInEscrow } from "../apps/api-server/src/services/walletService";

interface HttpResponse {
  status: number;
  body: any;
}

function makeRequest(
  port: number,
  path: string,
  method: string,
  data?: any,
  token?: string
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (data) {
      headers["Content-Length"] = Buffer.byteLength(postData).toString();
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers
      },
      (res) => {
        let bodyStr = "";
        res.on("data", (chunk) => (bodyStr += chunk));
        res.on("end", () => {
          let parsedBody: any;
          try {
            parsedBody = JSON.parse(bodyStr);
          } catch {
            parsedBody = bodyStr;
          }
          resolve({ status: res.statusCode || 500, body: parsedBody });
        });
      }
    );

    req.on("error", reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function signToken(userId: string, email: string, department: string) {
  return jwt.sign(
    { id: userId, email, department },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function runSprint2Verification() {
  console.log("===============================================================");
  console.log("🚀 STARTING SPRINT 2 VERIFICATION: DUAL-TOKEN ECONOMICS & ESCROW");
  console.log("===============================================================\n");

  const TEST_PORT = 5056;
  await connectDB("memory");
  const server = app.listen(TEST_PORT);

  try {
    // -------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------
    console.log("▶ [Setup] Seeding Test Students in Sukkur IBA Network...");
    const learner = await User.create({
      email: "ali.khan@iba-suk.edu.pk",
      name: "Ali Khan",
      department: "CS",
      tokenBalance: 5,
      escrowBalance: 0,
      isVerified: true
    });

    const tutor = await User.create({
      email: "sara.ahmed@iba-suk.edu.pk",
      name: "Sara Ahmed",
      department: "CS",
      tokenBalance: 5,
      escrowBalance: 0,
      skillsToTeach: ["Data Structures", "Algorithms"],
      isVerified: true
    });

    const brokeStudent = await User.create({
      email: "broke.student@iba-suk.edu.pk",
      name: "Broke Student",
      department: "BBA",
      tokenBalance: 0,
      escrowBalance: 0,
      isVerified: true
    });

    const learnerToken = signToken(learner._id.toString(), learner.email, learner.department);
    const tutorToken = signToken(tutor._id.toString(), tutor.email, tutor.department);
    const brokeToken = signToken(brokeStudent._id.toString(), brokeStudent.email, brokeStudent.department);

    console.log(`  ✔ Learner: ${learner.name} (${learner.email}) - Initial Tokens: ${learner.tokenBalance}`);
    console.log(`  ✔ Tutor: ${tutor.name} (${tutor.email}) - Initial Tokens: ${tutor.tokenBalance}`);

    // -------------------------------------------------------------
    // Test 1: Anti-Self Trading Guard
    // -------------------------------------------------------------
    console.log("\n▶ [Test 1] Anti-Self Trading: Learner attempts to book themselves...");
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const test1 = await makeRequest(
      TEST_PORT,
      "/api/v1/bookings",
      "POST",
      {
        tutorId: learner._id.toString(),
        skill: "Self Study",
        campusHub: "Knowledge Center",
        scheduledTime: futureDate,
        durationHours: 1
      },
      learnerToken
    );

    console.log(`  Response Status: ${test1.status} (${test1.body.message})`);
    if (test1.status === 400 && test1.body.message.includes("Self-trading prohibited")) {
      console.log("  ✔ SUCCESS: Self-trading rejected with status 400.");
    } else {
      throw new Error(`Test 1 FAILED: Expected 400 self-trade rejection, got ${test1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Double-Spend / Insufficient Balance Guard
    // -------------------------------------------------------------
    console.log("\n▶ [Test 2] Insufficient Balance Guard: 0-balance student books session...");
    const test2 = await makeRequest(
      TEST_PORT,
      "/api/v1/bookings",
      "POST",
      {
        tutorId: tutor._id.toString(),
        skill: "Data Structures",
        campusHub: "Knowledge Center",
        scheduledTime: futureDate,
        durationHours: 1
      },
      brokeToken
    );

    console.log(`  Response Status: ${test2.status} (${test2.body.message})`);
    if (test2.status === 400 && test2.body.message.includes("Insufficient token balance")) {
      console.log("  ✔ SUCCESS: Zero-token booking blocked atomically.");
    } else {
      throw new Error(`Test 2 FAILED: Expected 400 insufficient balance, got ${test2.status}`);
    }

    // -------------------------------------------------------------
    // Test 3: Valid Session Booking & Escrow Locking
    // -------------------------------------------------------------
    console.log("\n▶ [Test 3] Escrow Locking: Learner books Tutor for 1 hour (1 Token)...");
    const test3 = await makeRequest(
      TEST_PORT,
      "/api/v1/bookings",
      "POST",
      {
        tutorId: tutor._id.toString(),
        skill: "Data Structures",
        campusHub: "Knowledge Center",
        scheduledTime: futureDate,
        durationHours: 1
      },
      learnerToken
    );

    console.log(`  Response Status: ${test3.status}`);
    const bookingId = test3.body.data?._id;
    console.log(`  Booking ID: ${bookingId}, Status: ${test3.body.data?.status}`);

    const updatedLearner = await User.findById(learner._id);
    console.log(`  Learner Token Balance: ${updatedLearner?.tokenBalance} (Expected: 4)`);
    console.log(`  Learner Escrow Balance: ${updatedLearner?.escrowBalance} (Expected: 1)`);

    const lockTx = await Transaction.findOne({ session: bookingId, type: "escrow_lock" });
    console.log(`  Audit Lock Tx ID: ${lockTx?.transactionId}, Amount: ${lockTx?.amount}`);

    if (
      test3.status === 201 &&
      updatedLearner?.tokenBalance === 4 &&
      updatedLearner?.escrowBalance === 1 &&
      lockTx !== null
    ) {
      console.log("  ✔ SUCCESS: 1 token locked into escrow with immutable audit transaction.");
    } else {
      throw new Error("Test 3 FAILED: Escrow lock balances or transaction incorrect.");
    }

    // -------------------------------------------------------------
    // Test 4: Tutor Acceptance & 4-Digit PIN Generation
    // -------------------------------------------------------------
    console.log("\n▶ [Test 4] Tutor Acceptance: Tutor confirms booking & generates PIN...");
    const test4 = await makeRequest(
      TEST_PORT,
      `/api/v1/bookings/${bookingId}/status`,
      "PATCH",
      { action: "accept" },
      tutorToken
    );

    console.log(`  Response Status: ${test4.status}`);
    const sessionInDb = await Session.findById(bookingId);
    const pin = sessionInDb?.verificationPin;
    console.log(`  Session Status: ${sessionInDb?.status}, Generated 4-Digit PIN: ${pin}`);

    if (test4.status === 200 && sessionInDb?.status === "accepted" && pin && pin.length === 4) {
      console.log("  ✔ SUCCESS: Booking accepted and 4-digit PIN generated.");
    } else {
      throw new Error("Test 4 FAILED: Tutor acceptance failed or invalid PIN.");
    }

    // Verify PIN visibility invariant: Learner can see PIN, Tutor cannot until completion
    const learnerView = await makeRequest(TEST_PORT, `/api/v1/bookings/${bookingId}`, "GET", undefined, learnerToken);
    const tutorView = await makeRequest(TEST_PORT, `/api/v1/bookings/${bookingId}`, "GET", undefined, tutorToken);
    console.log(`  Learner views PIN: ${learnerView.body.data?.verificationPin}`);
    console.log(`  Tutor views PIN (should be undefined): ${tutorView.body.data?.verificationPin}`);
    if (learnerView.body.data?.verificationPin === pin && tutorView.body.data?.verificationPin === undefined) {
      console.log("  ✔ SUCCESS: PIN securely obfuscated from tutor until physical handshake.");
    } else {
      throw new Error("Test 4b FAILED: PIN privacy invariant violated.");
    }

    // -------------------------------------------------------------
    // Test 5: Physical Campus Handshake & Escrow Release
    // -------------------------------------------------------------
    console.log("\n▶ [Test 5] Physical Campus Handshake: Tutor enters matching PIN...");
    // Test with wrong PIN first
    const wrongPinRes = await makeRequest(
      TEST_PORT,
      `/api/v1/bookings/${bookingId}/status`,
      "PATCH",
      { action: "complete", verificationPin: "0000" },
      tutorToken
    );
    console.log(`  Wrong PIN Status: ${wrongPinRes.status} (${wrongPinRes.body.message})`);
    if (wrongPinRes.status !== 400) {
      throw new Error("Test 5 FAILED: Invalid PIN should be rejected with 400.");
    }

    // Complete with correct PIN
    const test5 = await makeRequest(
      TEST_PORT,
      `/api/v1/bookings/${bookingId}/status`,
      "PATCH",
      { action: "complete", verificationPin: pin },
      tutorToken
    );

    console.log(`  Response Status: ${test5.status}`);
    const completedLearner = await User.findById(learner._id);
    const completedTutor = await User.findById(tutor._id);
    console.log(`  Learner Balances: tokenBalance=${completedLearner?.tokenBalance}, escrowBalance=${completedLearner?.escrowBalance}`);
    console.log(`  Tutor Balances: tokenBalance=${completedTutor?.tokenBalance}, escrowBalance=${completedTutor?.escrowBalance}`);

    const releaseTx = await Transaction.findOne({ session: bookingId, type: "escrow_release" });
    console.log(`  Release Tx ID: ${releaseTx?.transactionId}, Amount: ${releaseTx?.amount}`);

    if (
      test5.status === 200 &&
      completedLearner?.escrowBalance === 0 &&
      completedTutor?.tokenBalance === 6 &&
      releaseTx !== null
    ) {
      console.log("  ✔ SUCCESS: Physical handshake verified; 1 Token released from escrow to Tutor!");
    } else {
      throw new Error("Test 5 FAILED: Escrow release balance invariant failure.");
    }

    // -------------------------------------------------------------
    // Test 6: Cancellation & 100% Instant Refund
    // -------------------------------------------------------------
    console.log("\n▶ [Test 6] Cancellation & 100% Refund: New booking cancelled by Learner...");
    const test6Booking = await makeRequest(
      TEST_PORT,
      "/api/v1/bookings",
      "POST",
      {
        tutorId: tutor._id.toString(),
        skill: "Algorithms",
        campusHub: "Academic Block III",
        scheduledTime: futureDate,
        durationHours: 1
      },
      learnerToken
    );
    const refundSessionId = test6Booking.body.data?._id;
    console.log(`  Created second booking: ${refundSessionId}`);

    const midLearner = await User.findById(learner._id);
    console.log(`  Mid-booking Learner Tokens: ${midLearner?.tokenBalance}, Escrow: ${midLearner?.escrowBalance}`);

    const test6Cancel = await makeRequest(
      TEST_PORT,
      `/api/v1/bookings/${refundSessionId}/status`,
      "PATCH",
      { action: "cancel", reason: "Schedule conflict with Midterm exam" },
      learnerToken
    );

    console.log(`  Cancel Status: ${test6Cancel.status}`);
    const refundedLearner = await User.findById(learner._id);
    console.log(`  Post-refund Learner Tokens: ${refundedLearner?.tokenBalance} (Expected: 4)`);
    console.log(`  Post-refund Learner Escrow: ${refundedLearner?.escrowBalance} (Expected: 0)`);

    const refundTx = await Transaction.findOne({ session: refundSessionId, type: "escrow_refund" });
    console.log(`  Refund Tx ID: ${refundTx?.transactionId}, Amount: ${refundTx?.amount}`);

    if (
      test6Cancel.status === 200 &&
      refundedLearner?.tokenBalance === 4 &&
      refundedLearner?.escrowBalance === 0 &&
      refundTx !== null
    ) {
      console.log("  ✔ SUCCESS: 100% escrow balance refunded to Learner instantly.");
    } else {
      throw new Error("Test 6 FAILED: Refund balances incorrect.");
    }

    // -------------------------------------------------------------
    // Test 7: ACID Transaction Rollback Verification
    // -------------------------------------------------------------
    console.log("\n▶ [Test 7] ACID Transaction Rollback: Mid-operation error aborts cleanly...");
    const learnerBefore = await User.findById(learner._id);
    const txCountBefore = await Transaction.countDocuments();

    const acidSession = await mongoose.startSession();
    acidSession.startTransaction();
    let caughtError = false;
    try {
      // Perform a lock
      await lockTokensInEscrow(learner._id, 1, new mongoose.Types.ObjectId(), acidSession);
      // Simulate unhandled failure before committing
      throw new Error("Simulated network crash during multi-document write");
    } catch (e: any) {
      caughtError = true;
      await acidSession.abortTransaction();
    } finally {
      await acidSession.endSession();
    }

    const learnerAfter = await User.findById(learner._id);
    const txCountAfter = await Transaction.countDocuments();

    console.log(`  Aborted mid-transfer successfully: ${caughtError}`);
    console.log(`  Learner balance before: ${learnerBefore?.tokenBalance}, after: ${learnerAfter?.tokenBalance}`);
    console.log(`  Transaction count before: ${txCountBefore}, after: ${txCountAfter}`);

    if (
      caughtError &&
      learnerBefore?.tokenBalance === learnerAfter?.tokenBalance &&
      txCountBefore === txCountAfter
    ) {
      console.log("  ✔ SUCCESS: ACID rollback guaranteed; zero orphaned balances or records.");
    } else {
      throw new Error("Test 7 FAILED: ACID transaction rollback failed.");
    }

    // -------------------------------------------------------------
    // Test 8: Wallet Summary Endpoint
    // -------------------------------------------------------------
    console.log("\n▶ [Test 8] Wallet Summary: Verify balances and ledger history for Tutor...");
    const walletRes = await makeRequest(TEST_PORT, "/api/v1/wallet", "GET", undefined, tutorToken);
    console.log(`  Response Status: ${walletRes.status}`);
    console.log(`  Tutor Token Balance: ${walletRes.body.data?.tokenBalance}`);
    console.log(`  Tutor Total Earned: ${walletRes.body.data?.totalEarned}`);
    console.log(`  Recent Transactions: ${walletRes.body.data?.recentTransactions?.length}`);

    if (
      walletRes.status === 200 &&
      walletRes.body.data?.tokenBalance === 6 &&
      walletRes.body.data?.totalEarned === 1 &&
      walletRes.body.data?.recentTransactions?.length >= 1
    ) {
      console.log("  ✔ SUCCESS: Wallet summary and transaction audit log verified.");
    } else {
      throw new Error("Test 8 FAILED: Wallet summary incorrect.");
    }

    console.log("\n===============================================================");
    console.log("🎉 ALL SPRINT 2 INVARIANTS & DELIVERABLES VERIFIED SUCCESSFULLY!");
    console.log("===============================================================");
  } finally {
    server.close();
    await disconnectDB();
  }
}

runSprint2Verification().catch((err) => {
  console.error("\n❌ SUITE EXECUTION ERROR:", err);
  process.exit(1);
});
