import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: AnyZodObject, target: ValidationTarget = "body") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "ValidationError",
          message: "Request validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message
          }))
        });
        return;
      }
      next(error);
    }
  };
}
