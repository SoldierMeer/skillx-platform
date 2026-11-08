import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import walletRoutes from "./routes/walletRoutes";
import chatRoutes from "./routes/chatRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import { initializeSockets } from "./sockets/socketManager";

export const app = express();

// Security and standard middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "SkillX API Server",
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/sessions", chatRoutes);
app.use("/api/v1/reviews", reviewRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[ServerError]", err);
  res.status(500).json({
    error: "InternalServerError",
    message: err.message || "An unexpected server error occurred"
  });
});

export const httpServer = http.createServer(app);
export const io = initializeSockets(httpServer);

export async function startServer(port = env.PORT): Promise<http.Server> {
  await connectDB();
  return new Promise<http.Server>((resolve) => {
    const server = httpServer.listen(port, () => {
      console.log(`====================================================`);
      console.log(`🚀 SkillX API Engine running on http://localhost:${port}`);
      console.log(`💬 Real-Time WebSockets Engine active`);
      console.log(`🎓 Sukkur IBA University Peer-to-Peer Network Active`);
      console.log(`🔒 Institutional Domain Barrier: @iba-suk.edu.pk`);
      console.log(`====================================================`);
      resolve(server);
    });
  });
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
