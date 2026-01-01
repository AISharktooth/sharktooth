# Repository Guidelines

## Project Structure & Module Organization
- `platform/gateway/`: Express API gateway, middleware chain, auth/RBAC, audit, and DB access.
- `workloads/ro-assistant/`: RO Assistant workload (ingest/search/answer), pgvector schema, and migrations.
- `shared/`: Cross-cutting types and utilities used by gateway and workloads.
- `scripts/`: Operational scripts (migrations, seeding, and test harnesses).
- `docs/` and `specs/`: Architecture, security, and execution specs.
- `dist/`: Build output from `npm run build` (compiled JS).

## Build, Test, and Development Commands
- `npm run dev`: Run the gateway in watch mode via `ts-node-dev`.
- `npm run build`: Compile TypeScript to `dist/`.
- `npm run start`: Run the compiled server from `dist/`.
- `npm run db:migrate`: Apply SQL migrations in `workloads/ro-assistant/db/migrations`.
- `ts-node scripts/seed_admin.ts`: Seed a default tenant/admin (requires `DATABASE_URL`).
- `npm run test:redaction`, `npm run test:pii-scan`, `npm run test:pii-ingest-db`: Run ingestion safety harnesses.

## Coding Style & Naming Conventions
- TypeScript with 2-space indentation; prefer explicit types at module boundaries.
- Filenames use `camelCase.ts` for services and `snake_case.sql` for migrations.
- Keep middleware and route handlers small; extract logic into services under `workloads/` or `platform/`.
- No formatter or linter is enforced (`npm run lint` is a placeholder).

## Testing Guidelines
- Test harnesses live in `scripts/tests/` and are executed via `ts-node`.
- Keep tests focused on ingestion safety, PII scanning, and DB behavior.
- Name scripts descriptively (e.g., `pii_ingest_db_harness.ts`).

## Commit & Pull Request Guidelines
- No strict commit convention is enforced in history; use short, imperative subjects (e.g., “Fix auth token parsing”).
- PRs should include: a brief summary, relevant commands run (e.g., `npm run test:pii-scan`), and any config changes.

## Security & Configuration Notes
- Require `DATABASE_URL` and Azure OpenAI env vars for embeddings; missing values surface as `EMBED_FAIL`.
- Ingestion must remain read-only with PII-safe behavior (PII scan before embedding).
- Keep JWT secrets and API keys out of commits; use `.env` locally.
