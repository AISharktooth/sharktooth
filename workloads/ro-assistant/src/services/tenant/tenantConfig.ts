import type { RequestContext } from "../../../../../shared/types/api";
import { AppError } from "../../../../../shared/utils/errors";
import type { DbClient } from "../../../../../platform/gateway/src/db/pg";

export const isTenantPiiEnabled = async (
  client: DbClient,
  ctx: RequestContext
): Promise<boolean> => {
  const result = await client.query<{ pii_enabled: boolean | null }>(
    `SELECT pii_enabled FROM app.tenants WHERE tenant_id = $1`,
    [ctx.tenantId]
  );
  if (!result.rows[0]) {
    throw new AppError("Tenant not found", { status: 404, code: "TENANT_NOT_FOUND" });
  }
  return Boolean(result.rows[0].pii_enabled);
};
