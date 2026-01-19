"use strict";

const { randomUUID } = require("crypto");

const STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  INGESTED: "INGESTED",
  FAILED: "FAILED",
  DUPLICATE: "DUPLICATE"
};

const withTenantClient = async (pool, tenantId, fn) => {
  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    return await fn(client);
  } finally {
    client.release();
  }
};

const upsertIngestFile = async (client, input) => {
  const result = await client.query(
    `INSERT INTO app.ingest_files
       (id, tenant_id, storage_uri, content_hash, source, status, error_code, last_event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (tenant_id, content_hash) DO UPDATE
        SET storage_uri = EXCLUDED.storage_uri,
            last_event_id = EXCLUDED.last_event_id
     RETURNING status, duplicate_count`,
    [
      input.id ?? randomUUID(),
      input.tenantId,
      input.storageUri,
      input.contentHash,
      input.source,
      STATUS.PENDING,
      null,
      input.eventId ?? null
    ]
  );
  return result.rows[0];
};

const claimIngestFile = async (client, tenantId, contentHash) => {
  const result = await client.query(
    `UPDATE app.ingest_files
        SET status = $1,
            processing_started_at = now(),
            error_code = NULL
      WHERE tenant_id = $2
        AND content_hash = $3
        AND status = $4
      RETURNING *`,
    [STATUS.PROCESSING, tenantId, contentHash, STATUS.PENDING]
  );
  return result.rows[0] ?? null;
};

const markDuplicate = async (client, tenantId, contentHash, eventId) => {
  const result = await client.query(
    `UPDATE app.ingest_files
        SET duplicate_count = duplicate_count + 1,
            last_event_id = $1
      WHERE tenant_id = $2
        AND content_hash = $3`,
    [eventId ?? null, tenantId, contentHash]
  );
  return result.rowCount === 1;
};

const markFailed = async (client, tenantId, contentHash, errorCode) => {
  const result = await client.query(
    `UPDATE app.ingest_files
        SET status = $1,
            error_code = $2,
            processed_at = now()
      WHERE tenant_id = $3
        AND content_hash = $4
        AND status = $5`,
    [STATUS.FAILED, errorCode ?? null, tenantId, contentHash, STATUS.PROCESSING]
  );
  return result.rowCount === 1;
};

const markIngested = async (client, tenantId, contentHash, eventId) => {
  const result = await client.query(
    `UPDATE app.ingest_files
        SET status = $1,
            error_code = NULL,
            processed_at = now(),
            last_event_id = $2
      WHERE tenant_id = $3
        AND content_hash = $4
        AND status = $5`,
    [STATUS.INGESTED, eventId ?? null, tenantId, contentHash, STATUS.PROCESSING]
  );
  return result.rowCount === 1;
};

const fetchIngestStatus = async (client, tenantId, contentHash) => {
  const result = await client.query(
    `SELECT status, duplicate_count
       FROM app.ingest_files
      WHERE tenant_id = $1 AND content_hash = $2`,
    [tenantId, contentHash]
  );
  return result.rows[0] ?? null;
};

const upsertWorkerMetrics = async (client, input) => {
  const totalProcessed = input.processedCount ?? 0;
  const totalProcessingMs = input.totalProcessingMs ?? 0;
  const totalSuccess = input.successCount ?? 0;
  const totalDuplicate = input.duplicateCount ?? 0;
  const totalFailure = input.failureCount ?? 0;
  const lastSuccessAt = input.lastSuccessAt ?? null;
  const lastErrorAt = input.lastErrorAt ?? null;

  await client.query(
    `INSERT INTO app.ingest_worker_metrics
       (worker_id, hostname, processed_count, success_count, duplicate_count, failure_count,
        total_processing_ms, avg_processing_ms, last_success_at, last_error_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)
     ON CONFLICT (worker_id) DO UPDATE
        SET hostname = EXCLUDED.hostname,
            processed_count = app.ingest_worker_metrics.processed_count + EXCLUDED.processed_count,
            success_count = app.ingest_worker_metrics.success_count + EXCLUDED.success_count,
            duplicate_count = app.ingest_worker_metrics.duplicate_count + EXCLUDED.duplicate_count,
            failure_count = app.ingest_worker_metrics.failure_count + EXCLUDED.failure_count,
            total_processing_ms =
              app.ingest_worker_metrics.total_processing_ms + EXCLUDED.total_processing_ms,
            avg_processing_ms = CASE
              WHEN (app.ingest_worker_metrics.processed_count + EXCLUDED.processed_count) = 0 THEN 0
              ELSE ROUND(
                (app.ingest_worker_metrics.total_processing_ms + EXCLUDED.total_processing_ms)::numeric
                / (app.ingest_worker_metrics.processed_count + EXCLUDED.processed_count),
                2
              )
            END,
            last_success_at = COALESCE(EXCLUDED.last_success_at, app.ingest_worker_metrics.last_success_at),
            last_error_at = COALESCE(EXCLUDED.last_error_at, app.ingest_worker_metrics.last_error_at),
            updated_at = now()`,
    [
      input.workerId,
      input.hostname ?? null,
      totalProcessed,
      totalSuccess,
      totalDuplicate,
      totalFailure,
      totalProcessingMs,
      lastSuccessAt,
      lastErrorAt
    ]
  );
};

module.exports = {
  STATUS,
  withTenantClient,
  upsertIngestFile,
  claimIngestFile,
  markDuplicate,
  markFailed,
  markIngested,
  fetchIngestStatus,
  upsertWorkerMetrics
};
