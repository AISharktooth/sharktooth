import { Router } from "express";
import type { RequestWithContext } from "../../../../../shared/types/api";
import { auditLog } from "../../core/audit/auditService";

export const healthRouter = Router();

healthRouter.get("/health", async (req, res) => {
  const ctx = (req as RequestWithContext).context;
  if (ctx?.tenantId && ctx?.userId) {
    void auditLog(ctx, { action: "HEALTH_CHECK", object_type: "system" });
  }
  res.json({ status: "ok", uptime: process.uptime() });
});
