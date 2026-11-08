import mongoose from "mongoose";
import { env } from "./env";

let mongoServer: any = null;

export async function connectDB(overrideUri?: string): Promise<typeof mongoose> {
  const uri = overrideUri || env.MONGODB_URI;

  try {
    if (uri === "memory") {
      const { MongoMemoryReplSet } = await import("mongodb-memory-server");
      mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
      const memoryUri = mongoServer.getUri();
      console.log(`[Database] Starting In-Memory Replica Set at ${memoryUri}`);
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Connected successfully to In-Memory Replica Set with ACID Transaction Support`);
      return conn;
    }

    console.log(`[Database] Connecting to MongoDB at ${uri.replace(/\/\/.*@/, "//***@")}...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });
    console.log(`[Database] Connected successfully to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    console.error(`[Database] Failed to connect to MongoDB (${uri}):`, error.message);
    if (env.NODE_ENV !== "production") {
      console.log(`[Database] Falling back to In-Memory Replica Set for local development/testing...`);
      try {
        const { MongoMemoryReplSet } = await import("mongodb-memory-server");
        mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        const memoryUri = mongoServer.getUri();
        const conn = await mongoose.connect(memoryUri);
        console.log(`[Database] Connected to In-Memory Replica Set at ${memoryUri} with ACID Transaction Support`);
        return conn;
      } catch (inMemErr: any) {
        console.error(`[Database] In-memory replica set fallback failed:`, inMemErr.message);
        throw inMemErr;
      }
    }
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}
