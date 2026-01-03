import type { RequestContext } from "../../../../../shared/types/api";
import { AppError } from "../../../../../shared/utils/errors";
import type { DbClient } from "../../../../../platform/gateway/src/db/pg";

export type PiiVaultRecord = {
  tenantId: string;
  roId: string;
  keyRef: string;
  nonce: Buffer;
  ciphertext: Buffer;
  createdAt: string;
  updatedAt: string;
};

const assertAdminWrite = (ctx: RequestContext) => {
  if (ctx.role !== "ADMIN" && ctx.role !== "DEALERADMIN" && ctx.role !== "DEVELOPER") {
    throw new AppError("PII write role denied", { status: 403, code: "PII_ROLE_DENIED" });
  }
};

const assertPiiRead = (ctx: RequestContext) => {
  if (ctx.role !== "ADMIN" && ctx.role !== "DEALERADMIN" && ctx.role !== "DEVELOPER") {
    throw new AppError("PII read role denied", { status: 403, code: "PII_ROLE_DENIED" });
  }
};

export const writePiiVaultRecord = async (
  client: DbClient,
  ctx: RequestContext,
  input: { roId: string; keyRef: string; nonce: Buffer; ciphertext: Buffer }
): Promise<void> => {
  assertAdminWrite(ctx);
  await client.query(
    `INSERT INTO app.pii_vault (tenant_id, ro_id, key_ref, nonce, ciphertext)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, ro_id)
     DO UPDATE SET key_ref = EXCLUDED.key_ref,
                   nonce = EXCLUDED.nonce,
                   ciphertext = EXCLUDED.ciphertext,
                   updated_at = now()`,
    [ctx.tenantId, input.roId, input.keyRef, input.nonce, input.ciphertext]
  );
};

export const readPiiVaultRecord = async (
  client: DbClient,
  ctx: RequestContext,
  roId: string
): Promise<PiiVaultRecord | null> => {
  assertPiiRead(ctx);
  const result = await client.query<PiiVaultRecord>(
    `SELECT tenant_id AS "tenantId",
            ro_id AS "roId",
            key_ref AS "keyRef",
            nonce,
            ciphertext,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
     FROM app.pii_vault
     WHERE tenant_id = $1 AND ro_id = $2`,
    [ctx.tenantId, roId]
  );
  return result.rows[0] ?? null;
};
