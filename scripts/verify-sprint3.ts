import http from "http";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { httpServer } from "../apps/api-server/src/server";
import { connectDB, disconnectDB } from "../apps/api-server/src/config/db";
import { env } from "../apps/api-server/src/config/env";
import { User } from "../apps/api-server/src/models/User";
import { Session } from "../apps/api-server/src/models/Session";
import { Message } from "../apps/api-server/src/models/Message";
import { Review } from "../apps/api-server/src/models/Review";

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

async function runSprint3Verification() {
  console.log("===============================================================");
  console.log("🚀 STARTING SPRINT 3 VERIFICATION: COMMS, REVIEWS & PILOT");
  console.log("===============================================================\n");

  const TEST_PORT = 5057;
  await connectDB("memory");

  await new Promise<void>((resolve) => {
    httpServer.listen(TEST_PORT, () => {
      resolve();
    });
  });

  const activeSockets: ClientSocket[] = [];

  function createClientSocket(token?: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = ioClient(`http://127.0.0.1:${TEST_PORT}`, {
        transports: ["websocket"],
        auth: token ? { token } : undefined,
        reconnection: false,
        timeout: 4000
      });

      activeSockets.push(socket);

      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", (err) => reject(err));
    });
  }

  try {
    // -------------------------------------------------------------
    // Setup Test Students
    // -------------------------------------------------------------
    console.log("▶ [Setup] Seeding pilot participants in Sukkur IBA Network...");
    const learner = await User.create({
      email: "bilal.tariq@iba-suk.edu.pk",
      name: "Bilal Tariq",
      department: "CS",
      tokenBalance: 5,
      escrowBalance: 0,
      rating: 5.0,
      reviewCount: 0,
      isVerified: true
    });

    const tutor = await User.create({
      email: "hira.mani@iba-suk.edu.pk",
      name: "Hira Mani",
      department: "Mathematics",
      tokenBalance: 5,
      escrowBalance: 0,
      rating: 5.0,
      reviewCount: 0,
      skillsToTeach: ["Calculus III", "Linear Algebra"],
      isVerified: true
    });

    const outsider = await User.create({
      email: "outsider@iba-suk.edu.pk",
      name: "Outsider Student",
      department: "BBA",
      tokenBalance: 5,
      escrowBalance: 0,
      rating: 5.0,
      reviewCount: 0,
      isVerified: true
    });

    const learnerToken = signToken(learner._id.toString(), learner.email, learner.department);
    const tutorToken = signToken(tutor._id.toString(), tutor.email, tutor.department);
    const outsiderToken = signToken(outsider._id.toString(), outsider.email, outsider.department);

    console.log(`  ✔ Learner: ${learner.name} (${learner.email})`);
    console.log(`  ✔ Tutor: ${tutor.name} (${tutor.email})`);

    // -------------------------------------------------------------
    // Test 1: Socket.io JWT Authentication
    // -------------------------------------------------------------
    console.log("\n▶ [Test 1] Socket.io Authentication: Reject unauthenticated connection...");
    let unauthRejected = false;
    try {
      await createClientSocket(); // No token provided
    } catch (err: any) {
      unauthRejected = true;
      console.log(`  ✔ Expected rejection: ${err.message}`);
    }

    if (unauthRejected) {
      console.log("  ✔ SUCCESS: Socket connection rejected without valid JWT.");
    } else {
      throw new Error("Test 1 FAILED: Socket connection without token should fail.");
    }

    const learnerSocket = await createClientSocket(learnerToken);
    const tutorSocket = await createClientSocket(tutorToken);
    console.log("  ✔ SUCCESS: Authenticated sockets connected for Learner and Tutor.");

    // -------------------------------------------------------------
    // Test 2: Chat Privacy - Pending Guard
    // -------------------------------------------------------------
    console.log("\n▶ [Test 2] Chat Privacy: Messaging blocked for 'pending' session...");
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const bookingRes = await makeRequest(
      TEST_PORT,
      "/api/v1/bookings",
      "POST",
      {
        tutorId: tutor._id.toString(),
        skill: "Calculus III",
        campusHub: "Knowledge Center",
        scheduledTime: futureDate,
        durationHours: 1
      },
      learnerToken
    );
    const sessionId = bookingRes.body.data?._id;
    console.log(`  Created pending booking: ${sessionId}`);

    // Try joining pending session via socket
    const joinPendingErrorPromise = new Promise<string>((resolve) => {
      learnerSocket.once("chat_error", (data) => resolve(data.message));
    });
    learnerSocket.emit("join_session", { sessionId });
    const joinPendingError = await joinPendingErrorPromise;
    console.log(`  Socket join rejection message: ${joinPendingError}`);

    // Try sending message via REST
    const restPendingSend = await makeRequest(
      TEST_PORT,
      `/api/v1/sessions/${sessionId}/messages`,
      "POST",
      { content: "Hello tutor, can we meet?" },
      learnerToken
    );
    console.log(`  REST send status: ${restPendingSend.status} (${restPendingSend.body.message})`);

    if (
      joinPendingError.includes("Messaging is blocked") &&
      restPendingSend.status === 400 &&
      restPendingSend.body.error === "ChatBlocked"
    ) {
      console.log("  ✔ SUCCESS: Messaging strictly blocked while session is pending.");
    } else {
      throw new Error("Test 2 FAILED: Chat should be blocked in pending state.");
    }

    // -------------------------------------------------------------
    // Test 3: Real-Time Delivery in Accepted Session
    // -------------------------------------------------------------
    console.log("\n▶ [Test 3] Real-Time Delivery: Tutor accepts booking & students exchange messages...");
    const acceptRes = await makeRequest(
      TEST_PORT,
      `/api/v1/bookings/${sessionId}/status`,
      "PATCH",
      { action: "accept" },
      tutorToken
    );
    console.log(`  Tutor accepted session: status=${acceptRes.body.data?.status}`);

    // Both join session room
    learnerSocket.emit("join_session", { sessionId });
    tutorSocket.emit("join_session", { sessionId });
    await new Promise((r) => setTimeout(r, 200));

    // Listen for real-time message on tutor socket
    const tutorReceivePromise = new Promise<any>((resolve) => {
      tutorSocket.once("new_message", (msg) => resolve(msg));
    });

    // Learner sends message
    learnerSocket.emit("send_message", {
      sessionId,
      content: "Assalamu Alaikum! Shall we meet at Ground Floor Library in Knowledge Center?"
    });

    const receivedMessage = await tutorReceivePromise;
    console.log(`  Tutor received real-time message: "${receivedMessage.content}"`);
    console.log(`  Sender: ${receivedMessage.senderName} (${receivedMessage.senderId})`);

    // Verify persistence in MongoDB
    const persistedMsg = await Message.findOne({ session: sessionId });
    if (
      receivedMessage.content.includes("Knowledge Center") &&
      persistedMsg !== null &&
      persistedMsg.content === receivedMessage.content
    ) {
      console.log("  ✔ SUCCESS: Real-time broadcast and MongoDB persistence verified.");
    } else {
      throw new Error("Test 3 FAILED: Message delivery or persistence failed.");
    }

    // Check REST paginated message retrieval
    const messagesHistory = await makeRequest(
      TEST_PORT,
      `/api/v1/sessions/${sessionId}/messages`,
      "GET",
      undefined,
      learnerToken
    );
    console.log(`  REST Messages Retrieved: ${messagesHistory.body.data?.length}`);
    if (messagesHistory.status === 200 && messagesHistory.body.data?.length >= 1) {
      console.log("  ✔ SUCCESS: Paginated chat history retrieved.");
    } else {
      throw new Error("Test 3b FAILED: Message history retrieval failed.");
    }

    // -------------------------------------------------------------
    // Test 4: Premature Review Blocked
    // -------------------------------------------------------------
    console.log("\n▶ [Test 4] Premature Review Guard: Attempt review while session is 'accepted'...");
    const prematureReview = await makeRequest(
      TEST_PORT,
      "/api/v1/reviews",
      "POST",
      {
        sessionId,
        rating: 5,
        feedback: "Awesome tutor before session even happened!",
        tags: ["Calculus"]
      },
      learnerToken
    );
    console.log(`  Premature Review Status: ${prematureReview.status} (${prematureReview.body.message})`);
    if (
      prematureReview.status === 400 &&
      prematureReview.body.message.includes("only be submitted for completed sessions")
    ) {
      console.log("  ✔ SUCCESS: Premature review rejected.");
    } else {
      throw new Error("Test 4 FAILED: Expected 400 rejection for non-completed session review.");
    }

    // -------------------------------------------------------------
    // Test 5: Complete Session & Chat Privacy (Completed Guard)
    // -------------------------------------------------------------
    console.log("\n▶ [Test 5] Complete Session & Verify Chat Post-Completion Lock...");
    const pin = acceptRes.body.data?.verificationPin;
    const completeRes = await makeRequest(
      TEST_PORT,
      `/api/v1/bookings/${sessionId}/status`,
      "PATCH",
      { action: "complete", verificationPin: pin },
      tutorToken
    );
    console.log(`  Session Completed: ${completeRes.body.data?.status}`);

    // Attempt sending message in completed session via REST
    const postCompleteSend = await makeRequest(
      TEST_PORT,
      `/api/v1/sessions/${sessionId}/messages`,
      "POST",
      { content: "Hey, thanks for the session!" },
      learnerToken
    );
    console.log(`  Post-complete send status: ${postCompleteSend.status} (${postCompleteSend.body.message})`);
    if (
      postCompleteSend.status === 400 &&
      postCompleteSend.body.error === "ChatBlocked"
    ) {
      console.log("  ✔ SUCCESS: Chat room correctly locked once session completed.");
    } else {
      throw new Error("Test 5 FAILED: Chat should be blocked in completed session.");
    }

    // -------------------------------------------------------------
    // Test 6: Peer Review Submission & Atomic Rating Aggregation
    // -------------------------------------------------------------
    console.log("\n▶ [Test 6] Review Submission & Mathematical Rating Aggregation...");
    // Tutor initial rating: 5.0, count: 0
    // Learner gives 4 stars: newRating should be (5.0*0 + 4) / 1 = 4.0
    const reviewRes = await makeRequest(
      TEST_PORT,
      "/api/v1/reviews",
      "POST",
      {
        sessionId,
        rating: 4,
        feedback: "Very clear explanation of multivariable calculus limits. Highly recommended!",
        tags: ["Calculus", "Patient", "Clear Concept"]
      },
      learnerToken
    );
    console.log(`  Review Status: ${reviewRes.status}`);

    const updatedTutor = await User.findById(tutor._id);
    console.log(`  Updated Tutor Rating: ${updatedTutor?.rating} (Expected: 4)`);
    console.log(`  Updated Tutor Review Count: ${updatedTutor?.reviewCount} (Expected: 1)`);

    if (
      reviewRes.status === 201 &&
      updatedTutor?.rating === 4 &&
      updatedTutor?.reviewCount === 1
    ) {
      console.log("  ✔ SUCCESS: Review created and tutor rating updated atomically.");
    } else {
      throw new Error("Test 6 FAILED: Rating aggregation incorrect.");
    }

    // Test duplicate review guard (One-Review-Per-Completed-Session)
    console.log("\n▶ [Test 6b] Duplicate Review Guard: Learner attempts second review on same session...");
    const dupReviewRes = await makeRequest(
      TEST_PORT,
      "/api/v1/reviews",
      "POST",
      {
        sessionId,
        rating: 5,
        feedback: "Submitting another review to bump rating...",
        tags: ["Spam"]
      },
      learnerToken
    );
    console.log(`  Duplicate Review Status: ${dupReviewRes.status} (${dupReviewRes.body.message})`);
    if (dupReviewRes.status === 409) {
      console.log("  ✔ SUCCESS: Duplicate review blocked with status 409 Conflict.");
    } else {
      throw new Error("Test 6b FAILED: Duplicate review should return 409.");
    }

    // -------------------------------------------------------------
    // Test 7: Public / Profile Review List Endpoint
    // -------------------------------------------------------------
    console.log("\n▶ [Test 7] Query Reviews: GET /api/v1/users/:userId/reviews...");
    const reviewsList = await makeRequest(
      TEST_PORT,
      `/api/v1/users/${tutor._id}/reviews`,
      "GET"
    );
    console.log(`  Reviews found: ${reviewsList.body.total}`);
    console.log(`  First Review Feedback: "${reviewsList.body.data?.[0]?.feedback}"`);
    console.log(`  Reviewer Name: ${reviewsList.body.data?.[0]?.reviewerName}`);
    if (
      reviewsList.status === 200 &&
      reviewsList.body.total === 1 &&
      reviewsList.body.data?.[0]?.rating === 4
    ) {
      console.log("  ✔ SUCCESS: Public review list verified.");
    } else {
      throw new Error("Test 7 FAILED: Review list retrieval incorrect.");
    }

    console.log("\n===============================================================");
    console.log("🎉 ALL SPRINT 3 INVARIANTS & DELIVERABLES VERIFIED SUCCESSFULLY!");
    console.log("===============================================================");
  } finally {
    // Disconnect sockets
    for (const s of activeSockets) {
      s.disconnect();
    }
    httpServer.close();
    await disconnectDB();
  }
}

runSprint3Verification().catch((err) => {
  console.error("\n❌ SUITE EXECUTION ERROR:", err);
  process.exit(1);
});
