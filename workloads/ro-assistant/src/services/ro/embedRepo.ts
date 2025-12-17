import type { RequestContext } from "../../../../../shared/types/api";
import type { DbClient } from "../../../../../platform/gateway/src/db/pg";

export type EmbeddingRow = {
  chunk_id: string;
  embedding: number[];
};

export const getEmbeddingsForChunks = async (
  client: DbClient,
  ctx: RequestContext,
  chunkIds: string[]
): Promise<EmbeddingRow[]> => {
  if (!chunkIds.length) return [];
  const { rows } = await client.query<EmbeddingRow>(
    `SELECT chunk_id, embedding
     FROM app.ro_embeddings
     WHERE tenant_id = $1 AND chunk_id = ANY($2::uuid[])`,
    [ctx.tenantId, chunkIds]
  );
  return rows;
};
