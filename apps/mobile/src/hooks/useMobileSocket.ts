import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { ChatMessage } from "@skillx/shared-contracts";
import { API_BASE_URL } from "../services/mobileApiClient";
import { getToken } from "../services/authStorage";

const SOCKET_URL = API_BASE_URL.replace("/api/v1", "");

export function useMobileSocket(sessionId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let socket: Socket;

    async function initSocket() {
      const token = await getToken();
      if (!token) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 10,
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
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      });
    }

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [sessionId]);

  const sendMessage = useCallback((targetSessionId: string, content: string) => {
    if (socketRef.current?.connected && content.trim()) {
      socketRef.current.emit("send_message", {
        sessionId: targetSessionId,
        content: content.trim()
      });
    }
  }, []);

  return {
    isConnected,
    messages,
    setMessages,
    error,
    sendMessage
  };
}
