BEGIN;

CREATE OR REPLACE FUNCTION app.auth_login_lookup(p_email citext)
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
   WHERE u.email = p_email
     AND u.is_active = true
     AND t.is_active = true;
$$;

REVOKE ALL ON FUNCTION app.auth_login_lookup(citext) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.auth_login_lookup(citext) TO app_runtime;

COMMIT;

