"use client";

import React, { useState } from "react";
import { UserProfile, CampusHub, CampusHubSchema } from "@skillx/shared-contracts";
import { X, Calendar, Clock, MapPin, Coins, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

interface BookingDrawerProps {
  tutor: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const campusHubs = CampusHubSchema.options;

export function BookingDrawer({ tutor, isOpen, onClose, onSuccess }: BookingDrawerProps) {
  const { user } = useAuth();
  const [skill, setSkill] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [campusHub, setCampusHub] = useState<CampusHub>("Knowledge Center");
  const [durationHours, setDurationHours] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tutor) return null;

  // Tomorrow 10:00 AM as a default suggested schedule
  const minDate = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!skill.trim()) {
      setError("Please select or enter the skill you wish to learn.");
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setError("Please select both a date and time for your campus session.");
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledDateTime <= new Date()) {
      setError("Scheduled time must be in the future.");
      return;
    }

    if ((user?.tokenBalance ?? 0) < durationHours) {
      setError(`Insufficient tokens. You have ${user?.tokenBalance ?? 0} tokens, but ${durationHours} is required.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/bookings", {
        tutorId: tutor._id,
        skill: skill.trim(),
        campusHub,
        scheduledTime: scheduledDateTime.toISOString(),
        durationHours
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to book session. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-iba-navy to-iba-light p-6 text-white flex items-start justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-teal-300">
              New Skill Exchange
            </span>
            <h2 className="text-xl font-bold mt-1">Book Session with {tutor.name}</h2>
            <p className="text-xs text-slate-200 mt-0.5">{tutor.department} &bull; Sukkur IBA University</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Skill Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Skill to Learn
            </label>
            {tutor.skillsToTeach && tutor.skillsToTeach.length > 0 ? (
              <select
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                required
              >
                <option value="">-- Choose from Tutor's Skills --</option>
                {tutor.skillsToTeach.map((s, idx) => (
                  <option key={idx} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="e.g. Python, Calculus, Financial Modeling"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                required
              />
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                Date
              </label>
              <input
                type="date"
                min={minDate}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                required
              />
            </div>
          </div>

          {/* Campus Meeting Hub (Radio Selection) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              IBA Campus Meeting Hub
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {campusHubs.map((hub) => (
                <label
                  key={hub}
                  className={`flex items-center p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    campusHub === hub
                      ? "border-teal-500 bg-teal-50 text-teal-900 font-bold ring-1 ring-teal-500"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="campusHub"
                    value={hub}
                    checked={campusHub === hub}
                    onChange={() => setCampusHub(hub)}
                    className="sr-only"
                  />
                  <span>{hub}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Escrow Token Cost Preview */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">1 Token Cost</p>
                <p className="text-[11px] text-slate-500">Locked safely into ACID escrow</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-700">Available: </span>
              <span className="text-xs font-extrabold text-amber-700">
                {user?.tokenBalance ?? 0} Tokens
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-iba-navy hover:bg-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSubmitting ? "Locking Escrow..." : "Confirm & Lock 1 Token"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
