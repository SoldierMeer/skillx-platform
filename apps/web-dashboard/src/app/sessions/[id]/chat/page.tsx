"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SessionBooking, ChatMessage, PaginatedResult } from "@skillx/shared-contracts";
import {
  Send,
  MapPin,
  Calendar,
  Lock,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Info
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { HandshakeModal } from "@/components/HandshakeModal";

export default function SessionChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { user } = useAuth();
  const [inputText, setInputText] = useState("");
  const [isHandshakeOpen, setIsHandshakeOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch session details
  const { data: sessionData, refetch: refetchSession } = useQuery<{ data: SessionBooking }>({
    queryKey: ["sessionDetails", sessionId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/${sessionId}`);
      return res.data;
    },
    enabled: Boolean(sessionId)
  });

  const session = sessionData?.data;

  // Initialize socket for this session room
  const {
    messages: liveMessages,
    setMessages,
    sendMessage,
    sendTyping,
    typingUsers,
    error: socketError
  } = useSocket(sessionId);

  // Initial fetch of message history
  const { data: historyData } = useQuery<PaginatedResult<ChatMessage>>({
    queryKey: ["chatHistory", sessionId],
    queryFn: async () => {
      const res = await apiClient.get(`/sessions/${sessionId}/messages?limit=100`);
      return res.data;
    },
    enabled: Boolean(sessionId)
  });

  // Merge history with live messages
  useEffect(() => {
    if (historyData?.data) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const merged = [...historyData.data.filter((m) => !existingIds.has(m.id)), ...prev];
        // Sort chronologically
        return merged.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    }
  }, [historyData, setMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages, typingUsers]);

  const isLearner =
    user?._id === (session?.learner as any)?._id || user?._id === session?.learner;
  const peer = isLearner ? (session?.tutor as any) : (session?.learner as any);
  const peerName = peer?.name || (isLearner ? "Tutor" : "Learner");

  const isChatActive =
    session?.status === "accepted" || session?.status === "in_progress";

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !isChatActive) return;

    sendMessage(sessionId, inputText.trim());
    setInputText("");
    sendTyping(sessionId, false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTyping(sessionId, e.target.value.length > 0);
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Session Context Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/bookings")}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-iba-navy to-iba-light text-white font-bold flex items-center justify-center text-sm shadow">
              {peerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                  {peerName}
                </h2>
                <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  {session?.skill || "Skill Exchange"}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5 font-semibold text-slate-700">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  {session?.campusHub}
                </span>
                <span>&bull;</span>
                <span className="capitalize font-semibold text-slate-600">
                  Status: {session?.status}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {!isLearner && session?.status === "accepted" && (
              <button
                onClick={() => setIsHandshakeOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Complete Handshake</span>
              </button>
            )}

            {isLearner && session?.status === "accepted" && session.verificationPin && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-800 block leading-none">
                  Your PIN
                </span>
                <span className="font-mono text-sm font-black text-amber-950">
                  {session.verificationPin}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SYSTEM INVARIANT 2: Chat Privacy Notice Banner */}
      {!isChatActive && session && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-3 flex items-center gap-3 text-amber-900 text-xs">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Chat Room Locked:</strong> Messaging is only permitted when a session is in{" "}
            <strong>accepted</strong> or <strong>in_progress</strong> state (Current: {session.status}).
          </span>
        </div>
      )}

      {socketError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 mb-3 text-xs text-rose-700">
          {socketError}
        </div>
      )}

      {/* Message Feed Container */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 overflow-y-auto space-y-3.5 shadow-inner">
        {liveMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <Info className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-medium">No messages yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Coordinate your meeting time and exact spot at {session?.campusHub || "Sukkur IBA"}.
            </p>
          </div>
        ) : (
          liveMessages.map((msg) => {
            const isMe = msg.senderId === user?._id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-md rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isMe
                      ? "bg-iba-navy text-white rounded-br-none"
                      : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60"
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-bold text-teal-700 mb-0.5">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{timeStr}</span>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="text-[11px] italic text-slate-400 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <span>{Object.values(typingUsers).join(", ")} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          disabled={!isChatActive}
          value={inputText}
          onChange={handleInputChange}
          placeholder={
            isChatActive
              ? "Type a message to coordinate your campus meeting..."
              : "Messaging disabled for this session"
          }
          className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs sm:text-sm text-slate-900 shadow-sm disabled:bg-slate-100 disabled:text-slate-400 transition"
        />
        <button
          type="submit"
          disabled={!isChatActive || !inputText.trim()}
          className="bg-iba-navy hover:bg-primary-hover text-white p-3 rounded-2xl shadow-md disabled:opacity-50 transition active:scale-95 flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Handshake Completion Modal for Tutor */}
      <HandshakeModal
        sessionId={sessionId}
        isOpen={isHandshakeOpen}
        onClose={() => setIsHandshakeOpen(false)}
        onSuccess={() => {
          refetchSession();
        }}
      />
    </div>
  );
}
