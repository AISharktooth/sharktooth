BEGIN;

CREATE TABLE IF NOT EXISTS app.dealer_groups (
  group_id   uuid PRIMARY KEY,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.tenants
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES app.dealer_groups(group_id);

COMMIT;
