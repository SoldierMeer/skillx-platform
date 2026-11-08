import { Request, Response } from "express";
import mongoose from "mongoose";
import { GetMessagesQuery, ChatMessage, PaginatedResult } from "@skillx/shared-contracts";
import { Message } from "../models/Message";
import { Session } from "../models/Session";
import { User } from "../models/User";
import { getIO } from "../sockets/socketManager";

export async function getSessionMessagesHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      res.status(400).json({ error: "ValidationError", message: "Invalid session ID format" });
      return;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: "NotFound", message: "Session not found" });
      return;
    }

    // Privacy Invariant 1: Caller must be a participant
    const isParticipant =
      session.learner.toString() === userId || session.tutor.toString() === userId;
    if (!isParticipant) {
      res.status(403).json({ error: "Forbidden", message: "Access denied: Not a session participant" });
      return;
    }

    const query = req.query as unknown as GetMessagesQuery;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Message.find({ session: session._id })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name"),
      Message.countDocuments({ session: session._id })
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const data: ChatMessage[] = docs.map((doc) => ({
      id: doc._id.toString(),
      sessionId: doc.session.toString(),
      senderId: doc.sender._id ? (doc.sender as any)._id.toString() : doc.sender.toString(),
      senderName: (doc.sender as any)?.name || "Student",
      content: doc.content,
      readAt: doc.readAt?.toISOString(),
      createdAt: doc.createdAt.toISOString()
    }));

    const result: PaginatedResult<ChatMessage> = {
      data,
      total,
      page,
      limit,
      totalPages
    };

    res.status(200).json(result);
  } catch (err: any) {
    console.error("[ChatController] getSessionMessages error:", err);
    res.status(500).json({
      error: "InternalServerError",
      message: err.message || "Failed to retrieve messages"
    });
  }
}

export async function sendMessageHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ error: "ValidationError", message: "Message content cannot be empty" });
      return;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: "NotFound", message: "Session not found" });
      return;
    }

    // Privacy Invariant 1: Caller must be a participant
    const isParticipant =
      session.learner.toString() === userId || session.tutor.toString() === userId;
    if (!isParticipant) {
      res.status(403).json({ error: "Forbidden", message: "Access denied: Not a session participant" });
      return;
    }

    // Privacy Invariant 2: Active session check (accepted or in_progress only)
    if (session.status !== "accepted" && session.status !== "in_progress") {
      res.status(400).json({
        error: "ChatBlocked",
        message: `Messaging is blocked: Session is in '${session.status}' status.`
      });
      return;
    }

    const user = await User.findById(userId).select("name");
    const senderName = user?.name || "Student";

    const messageDoc = await Message.create({
      session: session._id,
      sender: userId,
      content: content.trim()
    });

    const chatEvent: ChatMessage = {
      id: messageDoc._id.toString(),
      sessionId: session._id.toString(),
      senderId: userId,
      senderName,
      content: messageDoc.content,
      createdAt: messageDoc.createdAt.toISOString()
    };

    // Broadcast through Socket.io room if active
    try {
      const io = getIO();
      io.to(`session_${sessionId}`).emit("new_message", chatEvent);
    } catch {
      // Sockets not attached or no active listener
    }

    res.status(201).json({
      success: true,
      data: chatEvent
    });
  } catch (err: any) {
    console.error("[ChatController] sendMessage error:", err);
    res.status(500).json({
      error: "InternalServerError",
      message: err.message || "Failed to send message"
    });
  }
}
