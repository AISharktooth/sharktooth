BEGIN;

ALTER TABLE app.tenants
  ADD COLUMN IF NOT EXISTS pii_enabled boolean NOT NULL DEFAULT false;

COMMIT;
