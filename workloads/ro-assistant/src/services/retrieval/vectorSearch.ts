import type { RequestContext } from "../../../../../shared/types/api";
import type { DbClient } from "../../../../../platform/gateway/src/db/pg";

export type VectorMatch = {
  chunk_id: string;
  score: number;
};

export const vectorSearch = async (
  client: DbClient,
  ctx: RequestContext,
  queryEmbedding: number[],
  topK: number
): Promise<VectorMatch[]> => {
  const limit = Math.max(1, Math.min(topK, 50));
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;
  const { rows } = await client.query<VectorMatch>(
    `SELECT
        chunk_id,
        1 - (embedding <=> $2::vector) AS score
     FROM app.ro_embeddings
     WHERE tenant_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [ctx.tenantId, vectorLiteral, limit]
  );
  return rows;
};
