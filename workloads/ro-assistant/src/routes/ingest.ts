import type { RequestHandler } from "express";
import type { RequestWithContext } from "../../../../shared/types/api";
import { AppError } from "../../../../shared/utils/errors";
import { sha256 } from "../../../../shared/utils/hash";
import { auditLog } from "../../../../platform/gateway/src/core/audit/auditService";
import { runWithTransaction } from "../../../../platform/gateway/src/db/pg";
import { assertTenantContext } from "../../../../platform/gateway/src/core/tenant/tenantContext";
import { validateFileType } from "../services/ingest/validate";
import { extractText } from "../services/ingest/extractText";
import { redactPii } from "../services/ingest/redact";
import { assertNoPii } from "../services/ingest/piiScan";
import { chunkText } from "../services/ingest/chunk";
import { embedChunks } from "../services/ingest/embed";
import {
  storeDocument,
  storeRepairOrder,
  ensureChunkTables,
  storeChunksAndEmbeddings
} from "../services/ingest/store";

type IngestBody = {
  filename: string;
  content_base64: string;
  ro_number: string;
  mime_type?: string;
};

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024);

const decodeContent = (content_base64: string) => {
  try {
    return Buffer.from(content_base64, "base64");
  } catch (err) {
    throw new AppError("Invalid file content encoding", { status: 400, code: "CONTENT_DECODE" });
  }
};

export const ingestHandler: RequestHandler = async (req, res) => {
  const ctx = (req as RequestWithContext).context;
  if (!ctx?.requestId || !ctx?.tenantId || !ctx?.userId || !ctx?.role) {
    const error = new AppError("Missing request context", { status: 400, code: "CTX_MISSING" });
    return res.status(error.status ?? 400).json({ error: error.code, message: error.message });
  }

  if (ctx.role !== "ADMIN") {
    const error = new AppError("Admin role required", { status: 403, code: "ADMIN_ONLY" });
    return res.status(error.status ?? 403).json({ error: error.code, message: error.message });
  }

  const body = req.body as IngestBody;
  const safeCtx = assertTenantContext(ctx);
  if (!body?.filename || !body?.content_base64 || !body?.ro_number) {
    const error = new AppError("filename, content_base64, and ro_number are required", {
      status: 400,
      code: "BAD_REQUEST"
    });
    return res.status(error.status ?? 400).json({ error: error.code, message: error.message });
  }

  try {
    validateFileType(body.filename);
  } catch (err) {
    const error = err instanceof AppError ? err : new AppError("Invalid file type", { status: 400 });
    await auditLog(ctx ?? {}, {
      action: "INGEST_FAILED",
      object_type: "repair_order",
      object_id: safeCtx.requestId,
      metadata: { reason: "invalid_file_type", stage: "validate" }
    });
    return res.status(error.status ?? 400).json({ error: error.code, message: error.message });
  }

  if (body.content_base64.length > MAX_UPLOAD_BYTES * 2) {
    return res.status(413).json({ error: "FILE_TOO_LARGE", message: "Upload too large" });
  }

  const fileBuffer = decodeContent(body.content_base64);
  if (fileBuffer.byteLength > MAX_UPLOAD_BYTES) {
    await auditLog(ctx ?? {}, {
      action: "INGEST_FAILED",
      object_type: "repair_order",
      object_id: safeCtx.requestId,
      metadata: { reason: "file_too_large", stage: "validate" }
    });
    return res.status(413).json({ error: "FILE_TOO_LARGE", message: "Upload too large" });
  }
  const digest = sha256(fileBuffer);

  try {
    await runWithTransaction(safeCtx, async (client) => {
      await auditLog(safeCtx, {
        action: "UPLOAD_DOC",
        object_type: "document",
        object_id: digest.slice(0, 12),
        metadata: { filename: body.filename }
      });

      await ensureChunkTables(client);

      const docId = await storeDocument(client, safeCtx, {
        filename: body.filename,
        mimeType: body.mime_type ?? "application/octet-stream",
        sha256Hash: digest,
        storagePath: `ingest/${safeCtx.tenantId}/${digest}`,
        createdBy: safeCtx.userId
      });

      const roId = await storeRepairOrder(client, safeCtx, {
        docId,
        roNumber: body.ro_number
      });

      const rawText = extractText(fileBuffer);
      assertNoPii(rawText);
      const redactedText = redactPii(rawText);
      const chunks = chunkText(redactedText);
      const embeddings = await embedChunks(chunks);

      await storeChunksAndEmbeddings(client, safeCtx, { roId, chunks, embeddings });

      await auditLog(safeCtx, {
        action: "INGEST_COMPLETE",
        object_type: "repair_order",
        object_id: roId,
        metadata: { chunks: chunks.length }
      });
    });
  } catch (err) {
    const status =
      err instanceof AppError && err.code === "EMBED_FAIL"
        ? 503
        : err instanceof AppError && err.status
          ? err.status
          : 500;
    const code = err instanceof AppError && err.code ? err.code : "INGEST_ERROR";
    const msg =
      err instanceof AppError && err.code === "EMBED_FAIL"
        ? "Embedding unavailable"
        : err instanceof AppError
          ? err.message
          : "Ingestion failed";
    let stage = "unknown";
    if (err instanceof AppError && err.code === "PII_DETECTED") stage = "pii_detected";
    if (err instanceof AppError && err.code === "EMBED_FAIL") stage = "embed";

    await auditLog(ctx ?? {}, {
      action: "INGEST_FAILED",
      object_type: "repair_order",
      object_id: safeCtx?.requestId ?? undefined,
      metadata: {
        reason: msg.slice(0, 120),
        stage
      }
    });

    const includeDetail = process.env.NODE_ENV !== "production";
    const detail = includeDetail && err instanceof Error ? err.message : undefined;
    return res.status(status).json({ error: code, message: msg, detail });
  }

  return res.status(201).json({ status: "ok" });
};
