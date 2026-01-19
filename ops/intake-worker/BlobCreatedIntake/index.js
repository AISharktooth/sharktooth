"use strict";

const { BlobClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { createHash, randomUUID } = require("crypto");
const os = require("os");
const path = require("path");
const { Pool } = require("pg");
const { StringDecoder } = require("string_decoder");
const sax = require("sax");
const { fetch } = require("undici");
const {
  STATUS,
  withTenantClient,
  upsertIngestFile,
  claimIngestFile,
  markDuplicate,
  markFailed,
  markIngested,
  fetchIngestStatus,
  upsertWorkerMetrics
} = require("../ingestStore");

const REQUIRED_ENV = [
  "INTAKE_STORAGE_ACCOUNT",
  "INTAKE_CONTAINER",
  "INTAKE_ALLOWED_EXT",
  "INTAKE_MAX_BYTES",
  "INTAKE_WELLFORMED_XML",
  "INGEST_API_URL",
  "INGEST_AAD_AUDIENCE",
  "DATABASE_URL"
];

const parsePositiveInt = (value, name) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

const logJson = (level, event, data) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data
  };
  console.log(JSON.stringify(payload));
};

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const loadConfig = () => {
  for (const name of REQUIRED_ENV) {
    requireEnv(name);
  }

  const maxBytes = Number.parseInt(process.env.INTAKE_MAX_BYTES, 10);
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new Error("INTAKE_MAX_BYTES must be a positive integer");
  }

  const xmlFlag = process.env.INTAKE_WELLFORMED_XML;
  if (xmlFlag !== "0" && xmlFlag !== "1") {
    throw new Error("INTAKE_WELLFORMED_XML must be 0 or 1");
  }

  const allowedExt = process.env.INTAKE_ALLOWED_EXT.replace(/^\./, "").toLowerCase();
  if (!allowedExt) {
    throw new Error("INTAKE_ALLOWED_EXT must be a non-empty extension");
  }

  const ingestTimeoutMs = parsePositiveInt(process.env.INGEST_API_TIMEOUT_MS, "INGEST_API_TIMEOUT_MS") ?? 15000;
  const metricsLogEvery = parsePositiveInt(process.env.METRICS_LOG_EVERY, "METRICS_LOG_EVERY") ?? 10;
  const metricsFlushEvery = parsePositiveInt(process.env.METRICS_FLUSH_EVERY, "METRICS_FLUSH_EVERY") ?? 25;

  return {
    intakeStorageAccount: process.env.INTAKE_STORAGE_ACCOUNT,
    intakeContainer: process.env.INTAKE_CONTAINER,
    intakeAllowedExt: allowedExt,
    intakeMaxBytes: maxBytes,
    intakeWellformedXml: xmlFlag === "1",
    ingestApiUrl: process.env.INGEST_API_URL,
    ingestAadAudience: process.env.INGEST_AAD_AUDIENCE,
    ingestTimeoutMs,
    metricsLogEvery,
    metricsFlushEvery,
    workerId: process.env.WORKER_ID ?? `${os.hostname()}:${process.pid}`,
    databaseUrl: process.env.DATABASE_URL
  };
};

const config = loadConfig();
const credential = new DefaultAzureCredential();
const storageCredential = (() => {
  const connectionString =
    process.env.INTAKE_STORAGE_CONNECTION_STRING ?? process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) return null;
  const parts = Object.fromEntries(
    connectionString
      .split(";")
      .map((segment) => {
        const index = segment.indexOf("=");
        if (index === -1) return null;
        return [segment.slice(0, index), segment.slice(index + 1)];
      })
      .filter((pair) => pair && pair[0])
  );
  if (!parts.AccountName || !parts.AccountKey) {
    throw new Error("Storage connection string missing AccountName or AccountKey");
  }
  return new StorageSharedKeyCredential(parts.AccountName, parts.AccountKey);
})();
const pool = new Pool({ connectionString: config.databaseUrl });

const SOURCE = "ftp";
const METRICS = {
  processedCount: 0,
  successCount: 0,
  duplicateCount: 0,
  failureCount: 0,
  totalProcessingMs: 0,
  lastSuccessAt: null,
  lastErrorAt: null,
  pendingProcessed: 0,
  pendingSuccess: 0,
  pendingDuplicate: 0,
  pendingFailure: 0,
  pendingProcessingMs: 0
};

const recordMetrics = (result) => {
  if (!result || result.status === "SKIPPED") return;
  const processingMs = result.processingMs ?? 0;
  METRICS.processedCount += 1;
  METRICS.pendingProcessed += 1;
  METRICS.totalProcessingMs += processingMs;
  METRICS.pendingProcessingMs += processingMs;
  if (result.status === STATUS.INGESTED) {
    METRICS.successCount += 1;
    METRICS.pendingSuccess += 1;
    METRICS.lastSuccessAt = new Date();
  } else if (result.status === STATUS.DUPLICATE) {
    METRICS.duplicateCount += 1;
    METRICS.pendingDuplicate += 1;
  } else if (result.status === STATUS.FAILED) {
    METRICS.failureCount += 1;
    METRICS.pendingFailure += 1;
    METRICS.lastErrorAt = new Date();
  }

  if (METRICS.processedCount % config.metricsLogEvery === 0) {
    const avgMs =
      METRICS.processedCount === 0 ? 0 : Math.round(METRICS.totalProcessingMs / METRICS.processedCount);
    logJson("info", "metrics", {
      worker_id: config.workerId,
      processed_count: METRICS.processedCount,
      success_count: METRICS.successCount,
      duplicate_count: METRICS.duplicateCount,
      failure_count: METRICS.failureCount,
      avg_processing_ms: avgMs
    });
  }

  if (METRICS.pendingProcessed >= config.metricsFlushEvery) {
    flushMetrics().catch((err) => {
      logJson("error", "metrics_flush_failed", {
        worker_id: config.workerId,
        error: err instanceof Error ? err.message : err
      });
    });
  }
};

const flushMetrics = async () => {
  if (METRICS.pendingProcessed === 0) return;
  const client = await pool.connect();
  try {
    await upsertWorkerMetrics(client, {
      workerId: config.workerId,
      hostname: os.hostname(),
      processedCount: METRICS.pendingProcessed,
      successCount: METRICS.pendingSuccess,
      duplicateCount: METRICS.pendingDuplicate,
      failureCount: METRICS.pendingFailure,
      totalProcessingMs: METRICS.pendingProcessingMs,
      lastSuccessAt: METRICS.lastSuccessAt,
      lastErrorAt: METRICS.lastErrorAt
    });
  } finally {
    client.release();
  }
  METRICS.pendingProcessed = 0;
  METRICS.pendingSuccess = 0;
  METRICS.pendingDuplicate = 0;
  METRICS.pendingFailure = 0;
  METRICS.pendingProcessingMs = 0;
};

const parseTenantFromSubject = (subject, container) => {
  if (typeof subject !== "string") {
    return { ok: false };
  }
  const match = subject.match(/\/containers\/([^/]+)\/blobs\/(.+)/);
  if (!match) {
    return { ok: false };
  }
  if (match[1] !== container) {
    return { ok: false };
  }
  const decoded = decodeURIComponent(match[2]);
  const firstSegment = decoded.split("/")[0];
  if (!firstSegment || !firstSegment.startsWith("tenant=")) {
    return { ok: false };
  }
  const tenantId = firstSegment.slice("tenant=".length);
  if (!tenantId) {
    return { ok: false };
  }
  return { ok: true, tenantId };
};

const getBlobNameFromUrl = (blobUrl) => {
  const pathname = decodeURIComponent(new URL(blobUrl).pathname);
  return path.posix.basename(pathname);
};

const getBlobExtension = (blobName) => {
  if (!blobName) return "";
  return path.posix.extname(blobName).replace(/^\./, "").toLowerCase();
};

const downloadAndHash = async (blobClient, checkXml) => {
  const response = await blobClient.download(0);
  const stream = response.readableStreamBody;
  if (!stream) {
    throw new Error("Blob download stream unavailable");
  }

  const hash = createHash("sha256");
  let bytes = 0;
  let xmlWellFormed = true;
  let xmlError = null;
  let parser = null;
  let decoder = null;

  if (checkXml) {
    parser = sax.parser(true);
    decoder = new StringDecoder("utf8");
    parser.onerror = (err) => {
      xmlWellFormed = false;
      xmlError = err;
      parser.error = null;
    };
  }

  try {
    for await (const chunk of stream) {
      bytes += chunk.length;
      hash.update(chunk);
      if (checkXml && xmlWellFormed) {
        const text = decoder.write(chunk);
        if (text) {
          parser.write(text);
        }
      }
    }
    if (checkXml && xmlWellFormed) {
      const text = decoder.end();
      if (text) {
        parser.write(text);
      }
      parser.close();
    }
  } catch (err) {
    return {
      hash: hash.digest("hex"),
      bytes,
      xmlWellFormed: false,
      xmlError: xmlError ?? err,
      streamError: err
    };
  }

  return {
    hash: hash.digest("hex"),
    bytes,
    xmlWellFormed,
    xmlError,
    streamError: null
  };
};

const withTenant = (tenantId, fn) => withTenantClient(pool, tenantId, fn);

const callIngestApi = async (tenantId, storageUri) => {
  const scope = config.ingestAadAudience.endsWith("/.default")
    ? config.ingestAadAudience
    : `${config.ingestAadAudience}/.default`;
  const token = await credential.getToken(scope);
  if (!token?.token) {
    throw new Error("Failed to acquire Azure AD access token");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ingestTimeoutMs);
  try {
    return await fetch(config.ingestApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        storage_uri: storageUri,
        source: SOURCE
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
};

const processEvent = async (event, context) => {
  const startTime = Date.now();

  if (!event || event.eventType !== "Microsoft.Storage.BlobCreated") {
    return { status: "SKIPPED", processingMs: 0 };
  }

  const eventId = event.id ?? "unknown";
  const storageUri = event.data?.url;
  if (!storageUri) {
    logJson("error", "missing_storage_uri", { event_id: eventId });
    return {
      status: STATUS.FAILED,
      retryable: true,
      errorCode: "MISSING_STORAGE_URI",
      processingMs: 0
    };
  }

  logJson("info", "event_received", { event_id: eventId, storage_uri: storageUri });

  const tenantResult = parseTenantFromSubject(event.subject ?? "", config.intakeContainer);
  const tenantId = tenantResult.ok ? tenantResult.tenantId : "invalid";
  const invalidPath = !tenantResult.ok;

  const blobName = getBlobNameFromUrl(storageUri);
  const extension = getBlobExtension(blobName);
  const extensionValid = extension === config.intakeAllowedExt;

  let properties = null;
  let downloadResult = null;
  try {
    const blobClient = new BlobClient(storageUri, storageCredential ?? credential);
    properties = await blobClient.getProperties();
    downloadResult = await downloadAndHash(blobClient, config.intakeWellformedXml);
  } catch (err) {
    logJson("error", "blob_access_failed", {
      event_id: eventId,
      storage_uri: storageUri,
      error: err instanceof Error ? err.message : err
    });
    return {
      status: STATUS.FAILED,
      retryable: true,
      errorCode: "BLOB_ACCESS_FAILED",
      tenantId,
      storageUri,
      processingMs: Date.now() - startTime
    };
  }

  const contentHash = downloadResult.hash;
  const maxBytesExceeded =
    (properties?.contentLength ?? 0) > config.intakeMaxBytes || downloadResult.bytes > config.intakeMaxBytes;

  if (invalidPath) {
    logJson("error", "invalid_path", { event_id: eventId, storage_uri: storageUri });
    return {
      status: STATUS.FAILED,
      retryable: true,
      errorCode: "INVALID_PATH",
      tenantId,
      storageUri,
      processingMs: Date.now() - startTime
    };
  }

  const claimResult = await withTenant(tenantId, async (client) => {
    const upserted = await upsertIngestFile(client, {
      id: randomUUID(),
      tenantId,
      storageUri,
      contentHash,
      source: SOURCE,
      eventId
    });
    const claimed = await claimIngestFile(client, tenantId, contentHash);
    if (claimed) {
      return { claimed: true };
    }
    const status = await fetchIngestStatus(client, tenantId, contentHash);
    return { claimed: false, status };
  });

  if (!claimResult.claimed) {
    const existingStatus = claimResult.status?.status ?? STATUS.DUPLICATE;
    if (existingStatus === STATUS.INGESTED) {
      await withTenant(tenantId, (client) => markDuplicate(client, tenantId, contentHash, eventId));
      logJson("info", "duplicate", {
        event_id: eventId,
        tenant_id: tenantId,
        storage_uri: storageUri,
        content_hash: contentHash
      });
      return {
        status: STATUS.DUPLICATE,
        retryable: false,
        tenantId,
        storageUri,
        contentHash,
        processingMs: Date.now() - startTime
      };
    }

    logJson("info", "already_claimed", {
      event_id: eventId,
      tenant_id: tenantId,
      storage_uri: storageUri,
      status: existingStatus
    });
    return {
      status: existingStatus === STATUS.FAILED ? STATUS.FAILED : STATUS.DUPLICATE,
      retryable: existingStatus === STATUS.FAILED,
      tenantId,
      storageUri,
      contentHash,
      errorCode: existingStatus === STATUS.FAILED ? "ALREADY_FAILED" : "IN_FLIGHT",
      processingMs: Date.now() - startTime
    };
  }

  logJson("info", "claimed", { event_id: eventId, tenant_id: tenantId, content_hash: contentHash });

  if (downloadResult.streamError) {
    await withTenant(tenantId, (client) => markFailed(client, tenantId, contentHash, "DOWNLOAD_FAILED"));
    logJson("error", "download_failed", {
      event_id: eventId,
      tenant_id: tenantId,
      storage_uri: storageUri
    });
    return {
      status: STATUS.FAILED,
      retryable: true,
      tenantId,
      storageUri,
      contentHash,
      errorCode: "DOWNLOAD_FAILED",
      processingMs: Date.now() - startTime
    };
  }

  if (!extensionValid || maxBytesExceeded) {
    const errorCode = !extensionValid ? "INVALID_EXTENSION" : "FILE_TOO_LARGE";
    await withTenant(tenantId, (client) => markFailed(client, tenantId, contentHash, errorCode));
    logJson("error", "validation_failed", {
      event_id: eventId,
      tenant_id: tenantId,
      storage_uri: storageUri,
      error_code: errorCode
    });
    return {
      status: STATUS.FAILED,
      retryable: true,
      tenantId,
      storageUri,
      contentHash,
      errorCode,
      processingMs: Date.now() - startTime
    };
  }

  if (config.intakeWellformedXml && !downloadResult.xmlWellFormed) {
    await withTenant(tenantId, (client) => markFailed(client, tenantId, contentHash, "MALFORMED_XML"));
    logJson("error", "malformed_xml", {
      event_id: eventId,
      tenant_id: tenantId,
      storage_uri: storageUri
    });
    return {
      status: STATUS.FAILED,
      retryable: true,
      tenantId,
      storageUri,
      contentHash,
      errorCode: "MALFORMED_XML",
      processingMs: Date.now() - startTime
    };
  }

  logJson("info", "ingest_started", { event_id: eventId, tenant_id: tenantId, storage_uri: storageUri });

  let ingestResponse = null;
  try {
    ingestResponse = await callIngestApi(tenantId, storageUri);
  } catch (err) {
    const errorCode = err?.name === "AbortError" ? "INGEST_TIMEOUT" : "INGEST_ERROR";
    await withTenant(tenantId, (client) => markFailed(client, tenantId, contentHash, errorCode));
    logJson("error", "ingest_failed", {
      event_id: eventId,
      tenant_id: tenantId,
      storage_uri: storageUri,
      error_code: errorCode,
      error: err instanceof Error ? err.message : err
    });
    return {
      status: STATUS.FAILED,
      retryable: true,
      tenantId,
      storageUri,
      contentHash,
      errorCode,
      processingMs: Date.now() - startTime
    };
  }

  if (!ingestResponse.ok) {
    const errorCode = `INGEST_HTTP_${ingestResponse.status}`;
    await withTenant(tenantId, (client) => markFailed(client, tenantId, contentHash, errorCode));
    logJson("error", "ingest_http_error", {
      event_id: eventId,
      tenant_id: tenantId,
      storage_uri: storageUri,
      status: ingestResponse.status
    });
    return {
      status: STATUS.FAILED,
      retryable: true,
      tenantId,
      storageUri,
      contentHash,
      errorCode,
      processingMs: Date.now() - startTime
    };
  }

  await withTenant(tenantId, (client) => markIngested(client, tenantId, contentHash, eventId));
  logJson("info", "ingest_success", {
    event_id: eventId,
    tenant_id: tenantId,
    storage_uri: storageUri,
    content_hash: contentHash
  });

  return {
    status: STATUS.INGESTED,
    retryable: false,
    tenantId,
    storageUri,
    contentHash,
    processingMs: Date.now() - startTime
  };
};

const intakeHandler = async (context, event) => {
  const events = Array.isArray(event) ? event : [event];
  const results = [];
  for (const item of events) {
    const result = await processEvent(item, context);
    if (result) {
      recordMetrics(result);
      results.push(result);
    }
  }
  return { results };
};

intakeHandler.flushMetrics = flushMetrics;

module.exports = intakeHandler;
