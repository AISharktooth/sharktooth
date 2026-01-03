BEGIN;

DO $$ BEGIN
  CREATE TYPE app.user_role_new AS ENUM ('USER', 'ADMIN', 'DEALERADMIN', 'DEVELOPER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE app.users
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE app.users
  ALTER COLUMN role TYPE app.user_role_new
  USING (
    CASE
      WHEN role::text IN ('TECH', 'PII_APPROVED') THEN 'USER'
      ELSE role::text
    END
  )::app.user_role_new;

ALTER TABLE app.users
  ALTER COLUMN role SET DEFAULT 'USER';

DROP FUNCTION IF EXISTS app.auth_login_lookup(text);

ALTER TYPE app.user_role RENAME TO user_role_old;
ALTER TYPE app.user_role_new RENAME TO user_role;
DROP TYPE IF EXISTS app.user_role_old;

CREATE OR REPLACE FUNCTION app.auth_login_lookup(p_email text)
RETURNS TABLE(
  user_id uuid,
  tenant_id uuid,
  role app.user_role,
  pass_hash text,
  user_active boolean,
  tenant_active boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT u.user_id, u.tenant_id, u.role, u.pass_hash, u.is_active AS user_active, t.is_active AS tenant_active
    FROM app.users u
    JOIN app.tenants t ON t.tenant_id = u.tenant_id
   WHERE LOWER(u.email) = LOWER(p_email)
     AND u.is_active = true
     AND t.is_active = true;
$$;

REVOKE ALL ON FUNCTION app.auth_login_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.auth_login_lookup(text) TO app_runtime;

DROP POLICY IF EXISTS pii_vault_read_policy ON app.pii_vault;
CREATE POLICY pii_vault_read_policy
ON app.pii_vault
FOR SELECT
USING (
  tenant_id = app.current_tenant_id()
  AND app.current_role() IN ('ADMIN','DEVELOPER')
);

DROP POLICY IF EXISTS pii_vault_insert_policy ON app.pii_vault;
CREATE POLICY pii_vault_insert_policy
ON app.pii_vault
FOR INSERT
WITH CHECK (
  tenant_id = app.current_tenant_id()
  AND app.current_role() IN ('ADMIN','DEVELOPER')
);

DROP POLICY IF EXISTS pii_vault_update_policy ON app.pii_vault;
CREATE POLICY pii_vault_update_policy
ON app.pii_vault
FOR UPDATE
USING (
  tenant_id = app.current_tenant_id()
  AND app.current_role() IN ('ADMIN','DEVELOPER')
)
WITH CHECK (
  tenant_id = app.current_tenant_id()
  AND app.current_role() IN ('ADMIN','DEVELOPER')
);

DROP POLICY IF EXISTS pii_vault_delete_policy ON app.pii_vault;
CREATE POLICY pii_vault_delete_policy
ON app.pii_vault
FOR DELETE
USING (
  tenant_id = app.current_tenant_id()
  AND app.current_role() IN ('ADMIN','DEVELOPER')
);

COMMIT;
