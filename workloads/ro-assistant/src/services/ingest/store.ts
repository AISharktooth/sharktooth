import { randomUUID } from "crypto";
import type { RequestContext } from "../../../../../shared/types/api";
import { AppError } from "../../../../../shared/utils/errors";
import type { DbClient } from "../../../../../platform/gateway/src/db/pg";
import type { Chunk } from "./chunk";
import type { EmbeddedChunk } from "./embed";

type StoreDocumentInput = {
  filename: string;
  mimeType: string;
  sha256Hash: string;
  storagePath: string;
  createdBy: string;
};

export const ensureChunkTables = async (client: DbClient) => {
  const { rows } = await client.query<{ regclass: string | null }>(
    "SELECT to_regclass('app.ro_chunks') AS regclass"
  );
  if (!rows[0]?.regclass) {
    throw new AppError("ro_chunks table missing", { status: 500, code: "SCHEMA_MISSING" });
  }
  const emb = await client.query<{ regclass: string | null }>(
    "SELECT to_regclass('app.ro_embeddings') AS regclass"
  );
  if (!emb.rows[0]?.regclass) {
    throw new AppError("ro_embeddings table missing", { status: 500, code: "SCHEMA_MISSING" });
  }
};

export const storeDocument = async (
  client: DbClient,
  ctx: RequestContext,
  input: StoreDocumentInput
): Promise<string> => {
  const result = await client.query<{ doc_id: string }>(
    `INSERT INTO app.documents
       (doc_id, tenant_id, filename, mime_type, sha256, storage_path, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING doc_id`,
    [
      randomUUID(),
      ctx.tenantId,
      input.filename,
      input.mimeType,
      Buffer.from(input.sha256Hash, "hex"),
      input.storagePath,
      input.createdBy
    ]
  );
  return result.rows[0].doc_id;
};

export const storeRepairOrder = async (
  client: DbClient,
  ctx: RequestContext,
  input: { docId: string; roNumber: string }
): Promise<string> => {
  const result = await client.query<{ ro_id: string }>(
    `INSERT INTO app.repair_orders (ro_id, tenant_id, doc_id, ro_number)
     VALUES ($1, $2, $3, $4)
     RETURNING ro_id`,
    [randomUUID(), ctx.tenantId, input.docId, input.roNumber]
  );
  return result.rows[0].ro_id;
};

export const storeChunksAndEmbeddings = async (
  client: DbClient,
  ctx: RequestContext,
  input: { roId: string; chunks: Chunk[]; embeddings: EmbeddedChunk[] }
) => {
  for (const chunk of input.chunks) {
    // Guard: ensure no PII-pattern content is stored in chunk_text.
    const piiPatterns = [
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, // email
      /(\+?\d[\d\s().-]{8,}\d)/, // phone heuristic
      /\b[0-9A-HJ-NPR-Z]{17}\b/i // VIN
    ];
    const hasPii = piiPatterns.some((re) => re.test(chunk.text));
    if (hasPii) {
      throw new AppError("Redaction failed: PII detected in chunk", {
        status: 400,
        code: "PII_NOT_REDACTED"
      });
    }

    const chunkInsert = await client.query<{ chunk_id: string }>(
      `INSERT INTO app.ro_chunks (chunk_id, tenant_id, ro_id, chunk_text, chunk_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING chunk_id`,
      [randomUUID(), ctx.tenantId, input.roId, chunk.text, chunk.index]
    );
    const chunkId = chunkInsert.rows[0].chunk_id;
    const embedding = input.embeddings.find((e) => e.chunkId === chunk.id);
    if (!embedding) continue;

    const vectorLiteral = `[${embedding.embedding.join(",")}]`;
    await client.query(
      `INSERT INTO app.ro_embeddings (embedding_id, tenant_id, chunk_id, embedding)
       VALUES ($1, $2, $3, $4::vector)`,
      [randomUUID(), ctx.tenantId, chunkId, vectorLiteral]
    );
  }
};
