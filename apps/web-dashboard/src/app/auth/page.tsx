"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Department, DepartmentSchema, SukkurIbaEmailRegex } from "@skillx/shared-contracts";
import { Mail, User, GraduationCap, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const departments = DepartmentSchema.options;

export default function AuthPage() {
  const router = useRouter();
  const { requestOtp, verifyOtp, isAuthenticated } = useAuth();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<Department>("CS");
  const [otp, setOtp] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // If already authenticated, redirect to explore
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/explore");
    }
  }, [isAuthenticated, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!SukkurIbaEmailRegex.test(trimmedEmail)) {
      setError("Institutional Email Required: Must be an official @iba-suk.edu.pk email.");
      return;
    }

    if (name.trim().length < 2) {
      setError("Please enter your full student name (at least 2 characters).");
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestOtp(trimmedEmail, name.trim(), department);
      setSuccessMsg(res.message || "OTP code sent to your Sukkur IBA email!");
      setStep("otp");
      setCooldown(60);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6 || !/^\d{6}$/.test(otp.trim())) {
      setError("Please enter the exact 6-digit numeric verification code.");
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp(email.trim().toLowerCase(), otp.trim());
      router.push("/explore");
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Invalid or expired OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-tr from-iba-navy to-iba-light p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-2xl font-black shadow-lg mb-3">
            SX
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome to SkillX</h1>
          <p className="text-xs text-teal-200 font-medium mt-1">Sukkur IBA University Peer Skill Exchange</p>

          <div className="mt-4 inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/40 rounded-full px-3 py-1 text-[11px] font-bold text-amber-200">
            <Coins className="w-3.5 h-3.5 text-amber-300" />
            <span>5 Free Promo Tokens upon student verification</span>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && step === "otp" && (
            <div className="mb-5 p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-800 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === "details" ? (
            /* Step 1: Student Details */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  Full Student Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Meer Ansari"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                  Academic Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-teal-600" />
                  Sukkur IBA Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@iba-suk.edu.pk"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Must end with <code className="font-bold text-teal-700">@iba-suk.edu.pk</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-iba-navy hover:bg-primary-hover text-white text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? "Sending Passcode..." : "Request 6-Digit OTP"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Step 2: 6-Digit OTP Code */
            <form onSubmit={handleVerifyOtp} className="space-y-5 text-center">
              <div>
                <p className="text-xs text-slate-600 mb-1">
                  We sent a 6-digit verification passcode to:
                </p>
                <p className="font-mono text-sm font-bold text-iba-navy truncate">{email}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-56 mx-auto text-center text-3xl font-mono tracking-widest font-black py-3 rounded-2xl border-2 border-slate-300 focus:border-teal-500 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? "Verifying..." : "Verify & Activate Account"}
                <ShieldCheck className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Edit details
                </button>

                <button
                  type="button"
                  disabled={cooldown > 0 || isLoading}
                  onClick={handleRequestOtp}
                  className="text-teal-700 hover:text-teal-800 font-bold disabled:text-slate-400 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
