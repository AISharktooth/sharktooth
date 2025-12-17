import type { ErrorRequestHandler } from "express";
import { AppError } from "../../../../../shared/utils/errors";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = err instanceof AppError && err.status ? err.status : 500;
  const code = err instanceof AppError && err.code ? err.code : "INTERNAL_ERROR";
  const message =
    code === "INTERNAL_ERROR" ? "Internal server error" : err.message ?? "Request failed";
  const requestId = (req as any)?.context?.requestId;

  // Centralized error response to avoid leaking internals (e.g., DB errors, stack traces).
  res.status(status).json({ error: code, message, requestId });
};
