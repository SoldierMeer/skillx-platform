import http from "http";
import mongoose from "mongoose";
import { app } from "../apps/api-server/src/server";
import { connectDB, disconnectDB } from "../apps/api-server/src/config/db";
import { OtpToken } from "../apps/api-server/src/models/OtpToken";
import { User } from "../apps/api-server/src/models/User";

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

async function runVerificationSuite() {
  console.log("===============================================================");
  console.log("🚀 STARTING SPRINT 1 SANITY & VERIFICATION SUITE");
  console.log("===============================================================\n");

  const TEST_PORT = 5055;
  await connectDB("memory");
  const server = app.listen(TEST_PORT);

  try {
    // -------------------------------------------------------------
    // Test 1: Institutional Domain Barrier
    // -------------------------------------------------------------
    console.log("▶ [Test 1] Domain Barrier: Reject non-IBA email (student@gmail.com)...");
    const test1 = await makeRequest(TEST_PORT, "/api/v1/auth/request-otp", "POST", {
      email: "student@gmail.com",
      name: "Non IBA Student",
      department: "CS"
    });

    console.log(`  Response Status: ${test1.status}`);
    if (test1.status === 400) {
      console.log("  ✔ SUCCESS: Correctly rejected non-IBA domain with status 400.");
    } else {
      throw new Error(`Test 1 FAILED: Expected 400, got ${test1.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Valid IBA Email OTP Dispatch
    // -------------------------------------------------------------
    console.log("\n▶ [Test 2] OTP Dispatch: Accept meer.ansari@iba-suk.edu.pk...");
    const test2 = await makeRequest(TEST_PORT, "/api/v1/auth/request-otp", "POST", {
      email: "meer.ansari@iba-suk.edu.pk",
      name: "Meer Ansari",
      department: "CS"
    });

    console.log(`  Response Status: ${test2.status}`);
    console.log(`  Response Message: ${JSON.stringify(test2.body)}`);
    if (test2.status === 200 && test2.body.success) {
      console.log("  ✔ SUCCESS: OTP accepted and dispatched.");
    } else {
      throw new Error(`Test 2 FAILED: Expected 200, got ${test2.status}`);
    }

    // Inspect MongoDB for generated OTP token
    const tokenDoc = await OtpToken.findOne({ email: "meer.ansari@iba-suk.edu.pk" });
    if (!tokenDoc) {
      throw new Error("Test 2 FAILED: OtpToken was not recorded in MongoDB.");
    }
    console.log(`  ✔ Verified OtpToken created in DB. Expiry: ${tokenDoc.expiresAt}`);

    // Rate-limiting check: second request within 60s should get 429
    console.log("\n▶ [Test 2b] Rate-Limiting: Re-request OTP within 60s...");
    const test2b = await makeRequest(TEST_PORT, "/api/v1/auth/request-otp", "POST", {
      email: "meer.ansari@iba-suk.edu.pk",
      name: "Meer Ansari",
      department: "CS"
    });
    console.log(`  Response Status: ${test2b.status}`);
    if (test2b.status === 429) {
      console.log("  ✔ SUCCESS: Rate limiting enforced (429 Too Many Requests).");
    } else {
      throw new Error(`Test 2b FAILED: Expected 429, got ${test2b.status}`);
    }

    // -------------------------------------------------------------
    // Test 3: OTP Verification & Cold-Start Promo Economics
    // -------------------------------------------------------------
    console.log("\n▶ [Test 3] Verify OTP & Check 5 Promo Tokens Cold-Start...");
    // Let's test with wrong OTP first
    const testWrongOtp = await makeRequest(TEST_PORT, "/api/v1/auth/verify-otp", "POST", {
      email: "meer.ansari@iba-suk.edu.pk",
      otp: "000000"
    });
    console.log(`  Wrong OTP status: ${testWrongOtp.status} (${testWrongOtp.body.message})`);
    if (testWrongOtp.status !== 400) {
      throw new Error(`Test 3 FAILED: Invalid OTP should return 400, got ${testWrongOtp.status}`);
    }

    // In order to verify the valid OTP, let's create a known OTP in DB
    const crypto = await import("crypto");
    const testOtp = "789123";
    const testOtpHash = crypto.createHash("sha256").update(testOtp).digest("hex");
    await OtpToken.updateOne(
      { email: "meer.ansari@iba-suk.edu.pk" },
      { otpHash: testOtpHash, attempts: 0 }
    );

    const test3 = await makeRequest(TEST_PORT, "/api/v1/auth/verify-otp", "POST", {
      email: "meer.ansari@iba-suk.edu.pk",
      otp: testOtp
    });

    console.log(`  Response Status: ${test3.status}`);
    console.log(`  New User: ${test3.body.isNewUser}`);
    console.log(`  Token Balance: ${test3.body.user?.tokenBalance}`);
    console.log(`  Escrow Balance: ${test3.body.user?.escrowBalance}`);

    if (
      test3.status === 200 &&
      test3.body.isNewUser === true &&
      test3.body.user?.tokenBalance === 5 &&
      test3.body.user?.escrowBalance === 0 &&
      test3.body.tokens?.accessToken
    ) {
      console.log("  ✔ SUCCESS: User registered with exactly 5 Promo Tokens and signed JWT.");
    } else {
      throw new Error(`Test 3 FAILED: Invariants not satisfied. Body: ${JSON.stringify(test3.body)}`);
    }

    const jwtToken = test3.body.tokens.accessToken;

    // -------------------------------------------------------------
    // Test 4: Protected Profile Access (GET /me)
    // -------------------------------------------------------------
    console.log("\n▶ [Test 4] Protected Endpoint: GET /api/v1/auth/me...");
    const test4 = await makeRequest(TEST_PORT, "/api/v1/auth/me", "GET", undefined, jwtToken);
    console.log(`  Response Status: ${test4.status}`);
    console.log(`  Authenticated User: ${test4.body.user?.name} (${test4.body.user?.email})`);
    if (test4.status === 200 && test4.body.user?.email === "meer.ansari@iba-suk.edu.pk") {
      console.log("  ✔ SUCCESS: Profile retrieved with valid JWT.");
    } else {
      throw new Error(`Test 4 FAILED: Expected 200, got ${test4.status}`);
    }

    // -------------------------------------------------------------
    // Test 5: Profile Update (PUT /profile)
    // -------------------------------------------------------------
    console.log("\n▶ [Test 5] Update Profile: Add skillsToTeach: ['Python', 'Machine Learning']...");
    const test5 = await makeRequest(
      TEST_PORT,
      "/api/v1/users/profile",
      "PUT",
      {
        bio: "CS sophomore passionate about AI & Python tutoring.",
        skillsToTeach: ["Python", "Machine Learning"],
        skillsToLearn: ["Web3", "Graphic Design"],
        campusHubPreference: "Knowledge Center"
      },
      jwtToken
    );

    console.log(`  Response Status: ${test5.status}`);
    console.log(`  Updated Skills to Teach: ${JSON.stringify(test5.body.user?.skillsToTeach)}`);
    console.log(`  Updated Campus Hub: ${test5.body.user?.campusHubPreference}`);
    if (
      test5.status === 200 &&
      test5.body.user?.skillsToTeach.includes("Python") &&
      test5.body.user?.campusHubPreference === "Knowledge Center"
    ) {
      console.log("  ✔ SUCCESS: Profile updated successfully.");
    } else {
      throw new Error(`Test 5 FAILED: Expected 200 with updated skills, got ${test5.status}`);
    }

    // -------------------------------------------------------------
    // Test 6: Skill Discovery (GET /search?q=Python&type=teach)
    // -------------------------------------------------------------
    console.log("\n▶ [Test 6] Skill Discovery: GET /api/v1/users/search?q=Python&type=teach...");
    const test6 = await makeRequest(
      TEST_PORT,
      "/api/v1/users/search?q=Python&type=teach",
      "GET"
    );

    console.log(`  Response Status: ${test6.status}`);
    console.log(`  Results Found: ${test6.body.total}`);
    console.log(`  Matching Students: ${test6.body.data?.map((u: any) => u.name).join(", ")}`);
    if (test6.status === 200 && test6.body.total >= 1) {
      console.log("  ✔ SUCCESS: Student teaching Python found in discovery!");
    } else {
      throw new Error(`Test 6 FAILED: Expected at least 1 match, got ${test6.body.total}`);
    }

    // -------------------------------------------------------------
    // Test 7: Non-matching Search
    // -------------------------------------------------------------
    console.log("\n▶ [Test 7] Skill Discovery: Non-matching query (Rust)...");
    const test7 = await makeRequest(
      TEST_PORT,
      "/api/v1/users/search?q=Rust&type=teach",
      "GET"
    );
    console.log(`  Results Found: ${test7.body.total}`);
    if (test7.status === 200 && test7.body.total === 0) {
      console.log("  ✔ SUCCESS: 0 results returned for unoffered skill.");
    } else {
      throw new Error(`Test 7 FAILED: Expected 0, got ${test7.body.total}`);
    }

    console.log("\n===============================================================");
    console.log("🎉 ALL SPRINT 1 INVARIANTS & DELIVERABLES VERIFIED SUCCESSFULLY!");
    console.log("===============================================================");
  } finally {
    server.close();
    await disconnectDB();
  }
}

runVerificationSuite().catch((err) => {
  console.error("\n❌ SUITE EXECUTION ERROR:", err);
  process.exit(1);
});
