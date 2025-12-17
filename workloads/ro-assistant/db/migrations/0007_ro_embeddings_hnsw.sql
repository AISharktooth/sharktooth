BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'ro_embeddings_hnsw_idx' AND n.nspname = 'app'
  ) THEN
    CREATE INDEX ro_embeddings_hnsw_idx
      ON app.ro_embeddings
      USING hnsw (embedding vector_l2_ops);
  END IF;
END$$;

COMMIT;

