BEGIN;

ALTER TABLE app.ingest_files
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS duplicate_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_event_id text;

ALTER TABLE app.ingest_files
  ALTER COLUMN status SET DEFAULT 'PENDING';

UPDATE app.ingest_files
  SET status = 'PENDING'
  WHERE status IN ('RECEIVED', 'VALIDATED');

UPDATE app.ingest_files
  SET status = 'PROCESSING'
  WHERE status = 'INGESTING';

ALTER TABLE app.ingest_files
  DROP CONSTRAINT IF EXISTS ingest_files_status_check;
ALTER TABLE app.ingest_files
  ADD CONSTRAINT ingest_files_status_check
  CHECK (status IN ('PENDING', 'PROCESSING', 'INGESTED', 'FAILED', 'DUPLICATE'));

CREATE INDEX IF NOT EXISTS ingest_files_processing_idx
  ON app.ingest_files (status, updated_at);

CREATE TABLE IF NOT EXISTS app.ingest_worker_metrics (
  worker_id text PRIMARY KEY,
  hostname text,
  processed_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  total_processing_ms bigint NOT NULL DEFAULT 0,
  avg_processing_ms numeric(12, 2) NOT NULL DEFAULT 0,
  last_success_at timestamptz,
  last_error_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS ingest_worker_metrics_touch_updated_at ON app.ingest_worker_metrics;
CREATE TRIGGER ingest_worker_metrics_touch_updated_at
  BEFORE UPDATE ON app.ingest_worker_metrics
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

COMMIT;
