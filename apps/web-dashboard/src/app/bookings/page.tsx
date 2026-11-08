"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SessionBooking } from "@skillx/shared-contracts";
import {
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { HandshakeModal } from "@/components/HandshakeModal";
import { ReviewModal } from "@/components/ReviewModal";

export default function BookingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"active" | "history">("active");
  const [handshakeSessionId, setHandshakeSessionId] = useState<string | null>(null);
  const [reviewSession, setReviewSession] = useState<{ id: string; peerName: string } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: bookingsData, isLoading, refetch } = useQuery<{ data: SessionBooking[] }>({
    queryKey: ["userBookings"],
    queryFn: async () => {
      const res = await apiClient.get("/bookings?limit=50");
      return res.data;
    }
  });

  const allBookings = bookingsData?.data || [];

  const activeBookings = allBookings.filter(
    (b) => b.status === "pending" || b.status === "accepted" || b.status === "in_progress"
  );
  const historyBookings = allBookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled" || b.status === "rejected"
  );

  const displayedBookings = tab === "active" ? activeBookings : historyBookings;

  const handleTutorAccept = async (sessionId: string) => {
    try {
      await apiClient.patch(`/bookings/${sessionId}/status`, { action: "accept" });
      setActionSuccess("Session accepted! Physical handshake PIN generated for learner.");
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to accept session");
    }
  };

  const handleTutorReject = async (sessionId: string) => {
    const reason = prompt("Optional reason for declining:");
    try {
      await apiClient.patch(`/bookings/${sessionId}/status`, {
        action: "reject",
        reason: reason || "Unavailable at requested time"
      });
      setActionSuccess("Session rejected and learner refunded 100%.");
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject session");
    }
  };

  const handleCancel = async (sessionId: string) => {
    if (!confirm("Are you sure you want to cancel this booking? Escrowed tokens will be refunded.")) return;
    try {
      await apiClient.patch(`/bookings/${sessionId}/status`, {
        action: "cancel",
        reason: "Cancelled by student"
      });
      setActionSuccess("Session cancelled and tokens refunded.");
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to cancel session");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Session Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage peer bookings, handshake verification PINs, and campus exchange meetings.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "active"
                ? "bg-white text-iba-navy shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Active ({activeBookings.length})
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "history"
                ? "bg-white text-iba-navy shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            History ({historyBookings.length})
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-teal-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-teal-700 hover:text-teal-900 font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-200/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : displayedBookings.length > 0 ? (
        <div className="space-y-4">
          {displayedBookings.map((booking) => {
            const learnerObj: any = booking.learner;
            const tutorObj: any = booking.tutor;
            const isLearner = user?._id === learnerObj?._id || user?._id === booking.learner;
            const peer = isLearner ? tutorObj : learnerObj;
            const peerName = peer?.name || (isLearner ? "Tutor" : "Learner");

            const formattedDate = new Date(booking.scheduledTime).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric"
            });
            const formattedTime = new Date(booking.scheduledTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div
                key={booking._id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
              >
                {/* Header: Skill, Status & Peer info */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                          isLearner
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-teal-50 text-teal-800 border border-teal-200"
                        }`}
                      >
                        {isLearner ? "You are Learning" : "You are Tutoring"}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full ${
                          booking.status === "accepted"
                            ? "bg-teal-100 text-teal-900 border border-teal-300"
                            : booking.status === "pending"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : booking.status === "completed"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {booking.status.replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mt-2">
                      {booking.skill}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      With: <span className="font-bold text-slate-900">{peerName}</span> ({peer?.department || "Sukkur IBA"})
                    </p>
                  </div>

                  {/* Meeting Meta details */}
                  <div className="flex flex-wrap sm:flex-col sm:items-end gap-2 sm:gap-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      {formattedDate} at {formattedTime}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {booking.campusHub}
                    </span>
                  </div>
                </div>

                {/* SYSTEM INVARIANT 3: Physical Handshake PIN Banner for Learner */}
                {isLearner && booking.status === "accepted" && booking.verificationPin && (
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
                          🔐 In-Person Handshake PIN
                        </div>
                        <p className="text-[11px] text-amber-900/80 leading-tight">
                          Show this code to your tutor <strong>only when physically meeting</strong> at {booking.campusHub}.
                        </p>
                      </div>
                    </div>
                    <div className="bg-white px-5 py-2 rounded-xl border border-amber-400/80 shadow-sm text-center">
                      <span className="font-mono text-2xl font-black text-amber-950 tracking-widest">
                        {booking.verificationPin}
                      </span>
                    </div>
                  </div>
                )}

                {/* Footer Controls & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  {/* Chat Action */}
                  <a
                    href={`/sessions/${booking._id}/chat`}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      booking.status === "accepted" || booking.status === "in_progress"
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                        : "bg-slate-50 text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>
                      {booking.status === "accepted" ? "Session Chat Room" : "View Chat Log"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>

                  {/* State Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Tutor Pending Actions */}
                    {!isLearner && booking.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleTutorReject(booking._id)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleTutorAccept(booking._id)}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow transition"
                        >
                          Accept Session
                        </button>
                      </>
                    )}

                    {/* Tutor Complete Handshake Action */}
                    {!isLearner && booking.status === "accepted" && (
                      <button
                        onClick={() => setHandshakeSessionId(booking._id)}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Verify Handshake & Complete
                      </button>
                    )}

                    {/* Learner/Tutor Cancel Action */}
                    {(booking.status === "pending" || booking.status === "accepted") && (
                      <button
                        onClick={() => handleCancel(booking._id)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        Cancel
                      </button>
                    )}

                    {/* Review Action for Completed Sessions */}
                    {booking.status === "completed" && (
                      <button
                        onClick={() => setReviewSession({ id: booking._id, peerName })}
                        className="px-4 py-2 rounded-xl bg-iba-navy hover:bg-primary-hover text-white text-xs font-bold shadow transition flex items-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        Leave Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            No {tab === "active" ? "active" : "past"} sessions
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {tab === "active"
              ? "Find a tutor on the Explore page and request an exchange!"
              : "Completed and cancelled sessions will be archived here."}
          </p>
          {tab === "active" && (
            <a
              href="/explore"
              className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-iba-navy text-white text-xs font-bold shadow hover:bg-primary-hover transition"
            >
              Explore Tutors
            </a>
          )}
        </div>
      )}

      {/* Handshake Verification Modal */}
      <HandshakeModal
        sessionId={handshakeSessionId || ""}
        isOpen={Boolean(handshakeSessionId)}
        onClose={() => setHandshakeSessionId(null)}
        onSuccess={() => {
          setActionSuccess("Physical Handshake Verified! 1 Token released to your wallet.");
          refetch();
        }}
      />

      {/* Review Modal */}
      <ReviewModal
        sessionId={reviewSession?.id || ""}
        peerName={reviewSession?.peerName || "Student"}
        isOpen={Boolean(reviewSession)}
        onClose={() => setReviewSession(null)}
        onSuccess={() => {
          setActionSuccess("Peer review submitted! Thank you for strengthening the SkillX network.");
          refetch();
        }}
      />
    </div>
  );
}
