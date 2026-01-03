BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'DEALERADMIN'
  ) THEN
    ALTER TYPE app.user_role ADD VALUE 'DEALERADMIN';
  END IF;
END
$$;

COMMIT;
