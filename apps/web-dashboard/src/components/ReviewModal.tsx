"use client";

import React, { useState } from "react";
import { X, Star, AlertCircle, MessageSquareQuote } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface ReviewModalProps {
  sessionId: string;
  peerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const suggestedTags = ["Clear Explanations", "Punctual", "Patient", "Expert Knowledge", "Helpful Notes"];

export function ReviewModal({ sessionId, peerName, isOpen, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (feedback.trim().length < 5) {
      setError("Please write at least 5 characters of constructive feedback.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/reviews", {
        sessionId,
        rating,
        feedback: feedback.trim(),
        tags: selectedTags
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to submit review. You may have already reviewed this session."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-iba-navy to-iba-light p-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <MessageSquareQuote className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Review Skill Session</h2>
              <p className="text-xs text-slate-200">Leave feedback for {peerName}</p>
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
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <div className="text-center">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Overall Experience
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-500"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-amber-800 mt-1">
              {rating === 5 && "⭐ Outstanding / 5.0"}
              {rating === 4 && "⭐ Very Good / 4.0"}
              {rating === 3 && "⭐ Good / 3.0"}
              {rating === 2 && "⭐ Fair / 2.0"}
              {rating === 1 && "⭐ Needs Improvement / 1.0"}
            </p>
          </div>

          {/* Feedback Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Written Feedback
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What made this session helpful? E.g., Great real-world examples, punctual meeting at Knowledge Center..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              required
            />
          </div>

          {/* Peer Tag Checkboxes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Add Recognition Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {suggestedTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-teal-50 border-teal-500 text-teal-800 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {selectedTags.includes(tag) ? `✓ ${tag}` : `+ ${tag}`}
                </button>
              ))}
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
              disabled={isSubmitting || feedback.trim().length < 5}
              className="px-6 py-2.5 rounded-xl bg-iba-navy hover:bg-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
