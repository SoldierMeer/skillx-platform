import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Department } from "@skillx/shared-contracts";

export interface AuthUserPayload {
  id: string;
  email: string;
  department: Department;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authorization token required in format: Bearer <token>"
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      department: decoded.department
    };
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        error: "Unauthorized",
        message: "Session token has expired. Please sign in again."
      });
      return;
    }

    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or malformed authorization token."
    });
  }
}
