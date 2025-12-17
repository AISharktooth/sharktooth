import dotenv from "dotenv";
dotenv.config();
import { withRequestContext } from "../../platform/gateway/src/db/pg";
import { assertNoPii } from "../../workloads/ro-assistant/src/services/ingest/piiScan";

const ctx = {
  requestId: "pii-test",
  userId: "00000000-0000-0000-0000-000000000001",
  tenantId: "00000000-0000-0000-0000-000000000010",
  role: "ADMIN" as const
};

async function main() {
  const before = await withRequestContext(ctx, async (client) => {
    const chunks = await client.query("SELECT count(*) FROM app.ro_chunks WHERE tenant_id = $1", [ctx.tenantId]);
    const embeds = await client.query("SELECT count(*) FROM app.ro_embeddings WHERE tenant_id = $1", [ctx.tenantId]);
    return { chunks: Number(chunks.rows[0].count), embeds: Number(embeds.rows[0].count) };
  });

  let failed = false;
  try {
    assertNoPii("email test@example.com");
  } catch {
    failed = true;
  }
  if (!failed) {
    console.error("PII was not rejected");
    process.exit(1);
  }

  const after = await withRequestContext(ctx, async (client) => {
    const chunks = await client.query("SELECT count(*) FROM app.ro_chunks WHERE tenant_id = $1", [ctx.tenantId]);
    const embeds = await client.query("SELECT count(*) FROM app.ro_embeddings WHERE tenant_id = $1", [ctx.tenantId]);
    return { chunks: Number(chunks.rows[0].count), embeds: Number(embeds.rows[0].count) };
  });

  if (before.chunks !== after.chunks || before.embeds !== after.embeds) {
    console.error("Counts changed despite PII detection", { before, after });
    process.exit(1);
  }

  console.log("PII ingest DB harness passed: PII rejected and no chunks/embeddings created.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
