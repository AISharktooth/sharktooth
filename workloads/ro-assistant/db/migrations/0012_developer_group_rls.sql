BEGIN;

CREATE OR REPLACE FUNCTION app.current_group_id()
RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT group_id FROM app.tenants WHERE tenant_id = app.current_tenant_id();
$$;

-- Users
DROP POLICY IF EXISTS users_tenant_isolation ON app.users;
CREATE POLICY users_tenant_isolation
ON app.users
USING (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
)
WITH CHECK (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
);

-- Documents
DROP POLICY IF EXISTS documents_tenant_isolation ON app.documents;
CREATE POLICY documents_tenant_isolation
ON app.documents
USING (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
)
WITH CHECK (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
);

-- Repair Orders
DROP POLICY IF EXISTS ro_tenant_isolation ON app.repair_orders;
CREATE POLICY ro_tenant_isolation
ON app.repair_orders
USING (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
)
WITH CHECK (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
);

-- Labor Lines
DROP POLICY IF EXISTS labor_tenant_isolation ON app.ro_labor_lines;
CREATE POLICY labor_tenant_isolation
ON app.ro_labor_lines
USING (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
)
WITH CHECK (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
);

-- Parts Lines
DROP POLICY IF EXISTS parts_tenant_isolation ON app.ro_parts_lines;
CREATE POLICY parts_tenant_isolation
ON app.ro_parts_lines
USING (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
)
WITH CHECK (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
);

-- Audit Logs
DROP POLICY IF EXISTS audit_tenant_isolation ON app.audit_logs;
CREATE POLICY audit_tenant_isolation
ON app.audit_logs
USING (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
)
WITH CHECK (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
);

-- Chunks
DROP POLICY IF EXISTS ro_chunks_tenant_isolation ON app.ro_chunks;
CREATE POLICY ro_chunks_tenant_isolation
ON app.ro_chunks
USING (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
)
WITH CHECK (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
);

-- Embeddings
DROP POLICY IF EXISTS ro_embeddings_tenant_isolation ON app.ro_embeddings;
CREATE POLICY ro_embeddings_tenant_isolation
ON app.ro_embeddings
USING (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
)
WITH CHECK (
  app.current_role() = 'DEVELOPER'
  OR tenant_id = app.current_tenant_id()
  OR (
    app.current_role() = 'DEALERADMIN'
    AND app.current_group_id() IS NOT NULL
    AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
  )
);

-- PII Vault
DROP POLICY IF EXISTS pii_vault_read_policy ON app.pii_vault;
CREATE POLICY pii_vault_read_policy
ON app.pii_vault
FOR SELECT
USING (
  app.current_role() IN ('ADMIN','DEALERADMIN','DEVELOPER')
  AND (
    app.current_role() = 'DEVELOPER'
    OR tenant_id = app.current_tenant_id()
    OR (
      app.current_role() = 'DEALERADMIN'
      AND app.current_group_id() IS NOT NULL
      AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
    )
  )
);

DROP POLICY IF EXISTS pii_vault_insert_policy ON app.pii_vault;
CREATE POLICY pii_vault_insert_policy
ON app.pii_vault
FOR INSERT
WITH CHECK (
  app.current_role() IN ('ADMIN','DEALERADMIN','DEVELOPER')
  AND (
    app.current_role() = 'DEVELOPER'
    OR tenant_id = app.current_tenant_id()
    OR (
      app.current_role() = 'DEALERADMIN'
      AND app.current_group_id() IS NOT NULL
      AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
    )
  )
);

DROP POLICY IF EXISTS pii_vault_update_policy ON app.pii_vault;
CREATE POLICY pii_vault_update_policy
ON app.pii_vault
FOR UPDATE
USING (
  app.current_role() IN ('ADMIN','DEALERADMIN','DEVELOPER')
  AND (
    app.current_role() = 'DEVELOPER'
    OR tenant_id = app.current_tenant_id()
    OR (
      app.current_role() = 'DEALERADMIN'
      AND app.current_group_id() IS NOT NULL
      AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
    )
  )
)
WITH CHECK (
  app.current_role() IN ('ADMIN','DEALERADMIN','DEVELOPER')
  AND (
    app.current_role() = 'DEVELOPER'
    OR tenant_id = app.current_tenant_id()
    OR (
      app.current_role() = 'DEALERADMIN'
      AND app.current_group_id() IS NOT NULL
      AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
    )
  )
);

DROP POLICY IF EXISTS pii_vault_delete_policy ON app.pii_vault;
CREATE POLICY pii_vault_delete_policy
ON app.pii_vault
FOR DELETE
USING (
  app.current_role() IN ('ADMIN','DEALERADMIN','DEVELOPER')
  AND (
    app.current_role() = 'DEVELOPER'
    OR tenant_id = app.current_tenant_id()
    OR (
      app.current_role() = 'DEALERADMIN'
      AND app.current_group_id() IS NOT NULL
      AND tenant_id IN (SELECT tenant_id FROM app.tenants WHERE group_id = app.current_group_id())
    )
  )
);

COMMIT;
