"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { ChatMessage } from "@skillx/shared-contracts";
import { useAuth } from "./useAuth";

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "")
    : "http://localhost:5000");

export function useSocket(sessionId?: string) {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_SERVER_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
      if (sessionId) {
        socket.emit("join_session", { sessionId });
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("chat_error", (data: { message: string }) => {
      setError(data.message);
    });

    socket.on("new_message", (message: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate appending
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socket.on("typing", (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId === user?._id) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (data.isTyping) {
          next[data.userId] = data.userName;
        } else {
          delete next[data.userId];
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, sessionId, user?._id]);

  const joinSession = useCallback((targetSessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join_session", { sessionId: targetSessionId });
    }
  }, []);

  const sendMessage = useCallback((targetSessionId: string, content: string) => {
    if (!content.trim()) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit("send_message", {
        sessionId: targetSessionId,
        content: content.trim()
      });
    }
  }, []);

  const sendTyping = useCallback((targetSessionId: string, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing", {
        sessionId: targetSessionId,
        isTyping
      });
    }
  }, []);

  return {
    isConnected,
    messages,
    setMessages,
    typingUsers,
    error,
    joinSession,
    sendMessage,
    sendTyping
  };
}
