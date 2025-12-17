import type { RequestHandler } from "express";
import type { RequestWithContext } from "../../../../../shared/types/api";
import { evaluatePolicy } from "../../core/policy/policyEngine";
import { AppError } from "../../../../../shared/utils/errors";
import { auditLog } from "../../core/audit/auditService";

const actionForPath = (method: string, path: string): "PII_READ" | "PII_WRITE" | "BULK_DOWNLOAD" | "DEFAULT" => {
  if (path.includes("/pii/") && (method === "GET")) return "PII_READ";
  if (path.includes("/pii/") && (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE"))
    return "PII_WRITE";
  if (path.includes("/documents/") && path.includes("/download")) return "BULK_DOWNLOAD";
  return "DEFAULT";
};

export const policyMiddleware: RequestHandler = async (req, res, next) => {
  if (req.path === "/health") return next();

  const ctx = (req as RequestWithContext).context;
  if (!ctx?.tenantId) {
    const error = new AppError("Tenant missing for policy", { status: 403, code: "TENANT_POLICY_DENY" });
    return res.status(error.status ?? 403).json({ error: error.code, message: error.message });
  }

  const action = actionForPath(req.method, req.path);
  const decision = await evaluatePolicy(ctx, action, ctx.tenantId);
  if (!decision.allow) {
    await auditLog(ctx, {
      action: "POLICY_DENY",
      object_type: "policy",
      metadata: { reason: decision.reason ?? "denied", path: req.path, method: req.method }
    });
    const error = new AppError("Policy denied", { status: 403, code: "POLICY_DENY" });
    return res.status(error.status ?? 403).json({ error: error.code, message: error.message });
  }

  next();
};
