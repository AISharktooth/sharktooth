import assert from "assert";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const {
  STATUS,
  withTenantClient,
  upsertIngestFile,
  claimIngestFile,
  markDuplicate,
  markIngested,
  fetchIngestStatus
} = require("../../ops/intake-worker/ingestStore");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for ingest_claim_tests");
}

const pool = new Pool({ connectionString: databaseUrl });
const tenantId = `test-${randomUUID()}`;

const run = async () => {
  const contentHash = `hash-${randomUUID()}`;
  const storageUri = `https://example.test/tenant=${tenantId}/file.xml`;

  await withTenantClient(pool, tenantId, async (client: any) => {
    const upserted = await upsertIngestFile(client, {
      tenantId,
      storageUri,
      contentHash,
      source: "ftp",
      eventId: "event-1"
    });
    assert.strictEqual(upserted.status, STATUS.PENDING);

    const claimed = await claimIngestFile(client, tenantId, contentHash);
    assert.ok(claimed, "expected claim to succeed");
    assert.strictEqual(claimed.status, STATUS.PROCESSING);
  });

  await withTenantClient(pool, tenantId, async (client: any) => {
    const contentHash2 = `hash-${randomUUID()}`;
    await upsertIngestFile(client, {
      tenantId,
      storageUri,
      contentHash: contentHash2,
      source: "ftp",
      eventId: "event-2"
    });
    const claimed = await claimIngestFile(client, tenantId, contentHash2);
    assert.ok(claimed, "expected claim for second hash to succeed");
    await markIngested(client, tenantId, contentHash2, "event-2");

    const statusBefore = await fetchIngestStatus(client, tenantId, contentHash2);
    await markDuplicate(client, tenantId, contentHash2, "event-2-dup");
    const statusAfter = await fetchIngestStatus(client, tenantId, contentHash2);

    assert.strictEqual(statusBefore.status, STATUS.INGESTED);
    assert.strictEqual(statusAfter.status, STATUS.INGESTED);
    assert.strictEqual(statusAfter.duplicate_count, statusBefore.duplicate_count + 1);
  });

  await withTenantClient(pool, tenantId, async (client: any) => {
    const contentHash3 = `hash-${randomUUID()}`;
    await upsertIngestFile(client, {
      tenantId,
      storageUri,
      contentHash: contentHash3,
      source: "ftp",
      eventId: "event-3"
    });
    const claimed = await claimIngestFile(client, tenantId, contentHash3);
    assert.ok(claimed, "expected initial claim to succeed");
    const claimAgain = await claimIngestFile(client, tenantId, contentHash3);
    assert.strictEqual(claimAgain, null);
  });

  console.log("ingest claim tests passed");
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await withTenantClient(pool, tenantId, async (client: any) => {
      await client.query("DELETE FROM app.ingest_files WHERE tenant_id = $1", [tenantId]);
    });
    await pool.end();
  });
