BEGIN;

-- PII Vault: ciphertext only; payload contains:
-- customer_name, email, phones, address(city/state/zip), vin, license_plate, payment_method
CREATE TABLE IF NOT EXISTS app.pii_vault (
  tenant_id    uuid NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  ro_id        uuid NOT NULL REFERENCES app.repair_orders(ro_id) ON DELETE CASCADE,
  key_ref      text NOT NULL,
  nonce        bytea NOT NULL,
  ciphertext   bytea NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, ro_id)
);

ALTER TABLE app.pii_vault ENABLE ROW LEVEL SECURITY;

-- Read: ADMIN or PII_APPROVED
DROP POLICY IF EXISTS pii_vault_read_policy ON app.pii_vault;
CREATE POLICY pii_vault_read_policy
ON app.pii_vault
FOR SELECT
USING (
  tenant_id = app.current_tenant_id()
  AND app.current_role() IN ('ADMIN','PII_APPROVED')
);

-- Write: ADMIN only
DROP POLICY IF EXISTS pii_vault_insert_policy ON app.pii_vault;
CREATE POLICY pii_vault_insert_policy
ON app.pii_vault
FOR INSERT
WITH CHECK (
  tenant_id = app.current_tenant_id()
  AND app.current_role() = 'ADMIN'
);

DROP POLICY IF EXISTS pii_vault_update_policy ON app.pii_vault;
CREATE POLICY pii_vault_update_policy
ON app.pii_vault
FOR UPDATE
USING (
  tenant_id = app.current_tenant_id()
  AND app.current_role() = 'ADMIN'
)
WITH CHECK (
  tenant_id = app.current_tenant_id()
  AND app.current_role() = 'ADMIN'
);

DROP POLICY IF EXISTS pii_vault_delete_policy ON app.pii_vault;
CREATE POLICY pii_vault_delete_policy
ON app.pii_vault
FOR DELETE
USING (
  tenant_id = app.current_tenant_id()
  AND app.current_role() = 'ADMIN'
);

COMMIT;
