import type { RequestHandler } from "express";
import type { RequestWithContext } from "../../../../shared/types/api";
import { AppError } from "../../../../shared/utils/errors";
import { auditLog } from "../../../../platform/gateway/src/core/audit/auditService";
import { withRequestContext } from "../../../../platform/gateway/src/db/pg";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const roHandler: RequestHandler = async (req, res) => {
  const ctx = (req as RequestWithContext).context;
  if (!ctx?.role || !ctx?.tenantId || !ctx?.userId || !ctx?.requestId) {
    const error = new AppError("Missing request context", { status: 400, code: "CTX_MISSING" });
    return res.status(error.status ?? 400).json({ error: error.code, message: error.message });
  }
  if (ctx.role !== "TECH" && ctx.role !== "ADMIN" && ctx.role !== "PII_APPROVED") {
    const error = new AppError("Insufficient role", { status: 403, code: "ROLE_FORBIDDEN" });
    return res.status(error.status ?? 403).json({ error: error.code, message: error.message });
  }

  const roId = req.params.ro_id;
  if (!roId) {
    const error = new AppError("ro_id required", { status: 400, code: "BAD_REQUEST" });
    return res.status(error.status ?? 400).json({ error: error.code, message: error.message });
  }
  if (!isUuid(roId)) {
    const error = new AppError("ro_id must be a UUID", { status: 400, code: "INVALID_ID" });
    return res.status(error.status ?? 400).json({ error: error.code, message: error.message });
  }

  try {
    const { roResult, chunksResult } = await withRequestContext(ctx, async (client) => {
      const roResult = await client.query(
        `SELECT ro_id, ro_number, doc_id, ro_status, advisor_name, technician_name,
                vehicle_year, vehicle_make, vehicle_model, vehicle_color,
                mileage_in, mileage_out, labor_total, parts_total, total_due, created_at
           FROM app.repair_orders
          WHERE tenant_id = $1 AND ro_id = $2`,
        [ctx.tenantId, roId]
      );

      if (!roResult.rowCount) {
        return { roResult, chunksResult: null };
      }

      const chunksResult = await client.query(
        `SELECT chunk_id, chunk_index, chunk_text
           FROM app.ro_chunks
          WHERE tenant_id = $1 AND ro_id = $2
          ORDER BY chunk_index ASC`,
        [ctx.tenantId, roId]
      );

      return { roResult, chunksResult };
    });

    if (!roResult?.rowCount || !chunksResult) {
      const error = new AppError("RO not found", { status: 404, code: "NOT_FOUND" });
      return res.status(error.status ?? 404).json({ error: error.code, message: error.message });
    }

    await auditLog(ctx, {
      action: "VIEW_RO",
      object_type: "repair_order",
      object_id: roId
    });

    return res.status(200).json({
      ro: roResult.rows[0],
      chunks: chunksResult.rows.map((c) => ({
        chunk_id: c.chunk_id,
        chunk_index: c.chunk_index,
        excerpt: c.chunk_text
      }))
    });
  } catch (err) {
    const error = new AppError("RO fetch failed", { status: 500, code: "RO_FETCH_FAILED" });
    return res.status(error.status ?? 500).json({ error: error.code, message: error.message });
  }
};
