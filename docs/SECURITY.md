# Security Overview (Pilot)

Threat model (pilot scope):
- Single-tenant, single-instance gateway + workload.
- Primary risks: cross-tenant leakage, unauthorized PII exposure, un-audited access, insecure auth bypass.

Tenant isolation strategy:
- Auth context derives only from verified JWT.
- Middleware chain enforces tenant presence and active state before DB access.
- app.* session vars set per request; all SQL uses tenant_id filters; RLS enabled on all tenant tables.

PII handling guarantees:
- Ingestion blocks if PII patterns (email/phone/VIN/address) are detected before any storage/embedding.
- Redaction runs before chunking; chunks/embeddings written only after PII gate passes.
- No PII in logs, prompts, or embeddings; PII vault exists but PII endpoints are not implemented in this pilot.

Audit logging:
- Auth/RBAC/policy/rate-limit denials are audited.
- Ingestion failures audited with stage markers; successful ingress and audit list actions audited.
- Audit records never contain raw RO text or PII.

Known pilot limitations:
- Auth is JWT (HS256) with optional dev bypass in development; no IdP/SSO.
- Rate limiting is in-memory (single instance).
- PII detection uses regex heuristics; no AV or structured PII classification.
- Azure OpenAI embedding dependency; without credentials, embedding requests fail (ingest/search/answer unavailable).
