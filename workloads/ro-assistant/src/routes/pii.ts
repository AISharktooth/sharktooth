import type { RequestHandler } from "express";
import type { RequestWithContext } from "../../../../shared/types/api";
import { AppError } from "../../../../shared/utils/errors";
import { auditLog } from "../../../../platform/gateway/src/core/audit/auditService";
import { runWithTransaction } from "../../../../platform/gateway/src/db/pg";
import { assertTenantContext } from "../../../../platform/gateway/src/core/tenant/tenantContext";
import { readPiiVaultRecord } from "../services/pii/piiVault";
import { decryptPiiPayload } from "../services/pii/piiEncrypt";
import { isTenantPiiEnabled } from "../services/tenant/tenantConfig";

const normalizeReason = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return null;
  return trimmed;
};

export const piiReadHandler: RequestHandler = async (req, res) => {
  const ctx = (req as RequestWithContext).context;
  if (!ctx?.requestId || !ctx?.tenantId || !ctx?.userId || !ctx?.role) {
    const error = new AppError("Missing request context", { status: 400, code: "CTX_MISSING" });
    return res.status(error.status ?? 400).json({ error: error.code, message: error.message });
  }

  const reason = normalizeReason(req.query.reason);
  if (!reason) {
    const error = new AppError("reason query parameter required", {
      status: 400,
      code: "PII_REASON_REQUIRED"
    });
    return res.status(error.status ?? 400).json({ error: error.code, message: error.message });
  }

  const safeCtx = assertTenantContext(ctx);
  const roId = req.params.ro_id;

  try {
    const result = await runWithTransaction(safeCtx, async (client) => {
      const piiEnabled = await isTenantPiiEnabled(client, safeCtx);
      if (!piiEnabled) {
        throw new AppError("PII not enabled for tenant", { status: 403, code: "PII_NOT_ENABLED" });
      }
      const record = await readPiiVaultRecord(client, safeCtx, roId);
      if (!record) return null;
      const decrypted = await decryptPiiPayload({
        keyRef: record.keyRef,
        nonce: record.nonce,
        ciphertext: record.ciphertext
      });
      await auditLog(safeCtx, {
        action: "PII_READ",
        object_type: "pii_vault",
        object_id: roId,
        metadata: { reason }
      });
      return decrypted;
    });

    if (!result) {
      return res.status(404).json({ error: "PII_NOT_FOUND", message: "PII record not found" });
    }

    return res.status(200).json({ ro_id: roId, pii: result });
  } catch (err) {
    const status = err instanceof AppError && err.status ? err.status : 500;
    const code = err instanceof AppError && err.code ? err.code : "PII_READ_FAILED";
    const message = err instanceof AppError ? err.message : "PII read failed";
    return res.status(status).json({ error: code, message });
  }
};
