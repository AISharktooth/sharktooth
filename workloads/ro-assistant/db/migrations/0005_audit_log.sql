BEGIN;

CREATE TABLE IF NOT EXISTS app.audit_logs (
  audit_id     uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  user_id      uuid,
  request_id   text,
  action       text NOT NULL,
  object_type  text NOT NULL,
  object_id    text,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_tenant_isolation ON app.audit_logs;
CREATE POLICY audit_tenant_isolation
ON app.audit_logs
USING (tenant_id = app.current_tenant_id())
WITH CHECK (tenant_id = app.current_tenant_id());

COMMIT;
