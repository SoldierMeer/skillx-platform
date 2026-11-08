"use client";

import React, { useState } from "react";
import { X, KeyRound, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface HandshakeModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function HandshakeModal({ sessionId, isOpen, onClose, onSuccess }: HandshakeModalProps) {
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.trim().length !== 4 || !/^\d{4}$/.test(pin.trim())) {
      setError("Please enter the exact 4-digit numeric verification PIN.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.patch(`/bookings/${sessionId}/status`, {
        action: "complete",
        verificationPin: pin.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Invalid PIN. Verification failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 p-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Physical Campus Handshake</h2>
              <p className="text-xs text-teal-100">Release escrowed tokens to your wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-900 mb-1">🤝 Meeting In-Person at Campus Hub?</p>
            Ask the learner to show the <strong>4-digit Handshake PIN</strong> from their SkillX dashboard. Entering it below releases 1 token immediately to your account balance.
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
              Enter 4-Digit Learner PIN
            </label>
            <div className="flex justify-center">
              <input
                type="text"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-48 text-center text-3xl font-mono tracking-widest font-black py-3 rounded-2xl border-2 border-slate-300 focus:border-teal-500 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || pin.length !== 4}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              {isSubmitting ? "Verifying PIN..." : "Verify & Release Tokens"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
