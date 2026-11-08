import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";

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

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[ServerError]", err);
  res.status(500).json({
    error: "InternalServerError",
    message: err.message || "An unexpected server error occurred"
  });
});

export async function startServer(port = env.PORT) {
  await connectDB();
  return app.listen(port, () => {
    console.log(`====================================================`);
    console.log(`🚀 SkillX API Engine running on http://localhost:${port}`);
    console.log(`🎓 Sukkur IBA University Peer-to-Peer Network Active`);
    console.log(`🔒 Institutional Domain Barrier: @iba-suk.edu.pk`);
    console.log(`====================================================`);
  });
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
