BEGIN;

CREATE TABLE IF NOT EXISTS app.ro_chunks (
  chunk_id     uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  ro_id        uuid NOT NULL REFERENCES app.repair_orders(ro_id) ON DELETE CASCADE,
  chunk_text   text NOT NULL,
  chunk_index  int NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.ro_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ro_chunks_tenant_isolation ON app.ro_chunks;
CREATE POLICY ro_chunks_tenant_isolation
ON app.ro_chunks
USING (tenant_id = app.current_tenant_id())
WITH CHECK (tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS app.ro_embeddings (
  embedding_id uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  chunk_id     uuid NOT NULL REFERENCES app.ro_chunks(chunk_id) ON DELETE CASCADE,
  embedding    vector(1536) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chunk_id)
);

ALTER TABLE app.ro_embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ro_embeddings_tenant_isolation ON app.ro_embeddings;
CREATE POLICY ro_embeddings_tenant_isolation
ON app.ro_embeddings
USING (tenant_id = app.current_tenant_id())
WITH CHECK (tenant_id = app.current_tenant_id());

COMMIT;
