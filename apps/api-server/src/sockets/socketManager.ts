import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { SendMessageSchema, ChatMessage } from "@skillx/shared-contracts";
import { env } from "../config/env";
import { User } from "../models/User";
import { Session } from "../models/Session";
import { Message } from "../models/Message";

export interface SocketUser {
  id: string;
  name: string;
  email: string;
}

declare module "socket.io" {
  interface SocketData {
    user?: SocketUser;
  }
}

let ioInstance: Server | null = null;

export function initializeSockets(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : undefined);

      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string };
      const user = await User.findById(decoded.id).select("name email");
      if (!user) {
        return next(new Error("Authentication error: Student user not found"));
      }

      socket.data.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      };

      next();
    } catch (err: any) {
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user;
    if (!user) return;

    // Join Session Room: session_${sessionId}
    socket.on("join_session", async (payload: { sessionId: string }) => {
      try {
        const { sessionId } = payload || {};
        if (!sessionId) {
          socket.emit("chat_error", { message: "Session ID required" });
          return;
        }

        const session = await Session.findById(sessionId);
        if (!session) {
          socket.emit("chat_error", { message: "Session not found" });
          return;
        }

        // Privacy Invariant 1: Caller must be learner or tutor
        const isParticipant =
          session.learner.toString() === user.id || session.tutor.toString() === user.id;
        if (!isParticipant) {
          socket.emit("chat_error", { message: "Access denied: Not a participant in this session" });
          return;
        }

        // Privacy Invariant 2: Active status check (accepted or in_progress only)
        if (session.status !== "accepted" && session.status !== "in_progress") {
          socket.emit("chat_error", {
            message: `Messaging is blocked: Session is in '${session.status}' state.`
          });
          return;
        }

        const roomName = `session_${sessionId}`;
        socket.join(roomName);
        socket.emit("joined_session", { sessionId, room: roomName });
      } catch (err: any) {
        socket.emit("chat_error", { message: err.message || "Failed to join session room" });
      }
    });

    // Send Message Event
    socket.on("send_message", async (payload: { sessionId: string; content: string }) => {
      try {
        const parseResult = SendMessageSchema.safeParse(payload);
        if (!parseResult.success) {
          socket.emit("chat_error", {
            message: parseResult.error.errors[0]?.message || "Invalid message format"
          });
          return;
        }

        const { sessionId, content } = parseResult.data;
        const session = await Session.findById(sessionId);
        if (!session) {
          socket.emit("chat_error", { message: "Session not found" });
          return;
        }

        // Privacy Invariant 1: Caller must be participant
        const isParticipant =
          session.learner.toString() === user.id || session.tutor.toString() === user.id;
        if (!isParticipant) {
          socket.emit("chat_error", { message: "Access denied: Not a session participant" });
          return;
        }

        // Privacy Invariant 2: Active status check
        if (session.status !== "accepted" && session.status !== "in_progress") {
          socket.emit("chat_error", {
            message: `Message blocked: Session is '${session.status}'. Messaging is only allowed in accepted or in_progress sessions.`
          });
          return;
        }

        const messageDoc = await Message.create({
          session: session._id,
          sender: user.id,
          content: content.trim()
        });

        const chatEvent: ChatMessage = {
          id: messageDoc._id.toString(),
          sessionId,
          senderId: user.id,
          senderName: user.name,
          content: messageDoc.content,
          createdAt: messageDoc.createdAt.toISOString()
        };

        io.to(`session_${sessionId}`).emit("new_message", chatEvent);
      } catch (err: any) {
        socket.emit("chat_error", { message: err.message || "Failed to deliver message" });
      }
    });

    // Typing Event
    socket.on("typing", (payload: { sessionId: string; isTyping: boolean }) => {
      if (payload?.sessionId) {
        socket.to(`session_${payload.sessionId}`).emit("typing", {
          userId: user.id,
          userName: user.name,
          isTyping: Boolean(payload.isTyping)
        });
      }
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error("Socket.io has not been initialized");
  }
  return ioInstance;
}
