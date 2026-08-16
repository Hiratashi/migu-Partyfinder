-- Distinguish an explicitly completed party from one that simply aged out.
ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS expired_at timestamptz;

DO $$
DECLARE
  status_typtype "char";
  status_type regtype;
  c record;
BEGIN
  SELECT t.typtype, a.atttypid::regtype
    INTO status_typtype, status_type
  FROM pg_attribute a
  JOIN pg_class tbl ON tbl.oid=a.attrelid
  JOIN pg_namespace ns ON ns.oid=tbl.relnamespace
  JOIN pg_type t ON t.oid=a.atttypid
  WHERE tbl.relname='parties'
    AND ns.nspname=current_schema()
    AND a.attname='status'
    AND NOT a.attisdropped;

  IF status_typtype='e' THEN
    EXECUTE format(
      'ALTER TYPE %s ADD VALUE IF NOT EXISTS %L',
      status_type,
      'EXPIRED'
    );
  ELSE
    -- If status is text/varchar and an older CHECK constraint limits the
    -- allowed values, replace that status-specific constraint.
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid='parties'::regclass
        AND contype='c'
        AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
      EXECUTE format(
        'ALTER TABLE parties DROP CONSTRAINT %I',
        c.conname
      );
    END LOOP;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid='parties'::regclass
        AND conname='parties_status_valid'
    ) THEN
      ALTER TABLE parties
        ADD CONSTRAINT parties_status_valid
        CHECK (
          status IN (
            'OPEN',
            'FULL',
            'DONE',
            'CANCELLED',
            'EXPIRED'
          )
        );
    END IF;
  END IF;
END $$;

-- The immediately-previous cleanup marked stale active parties DONE without
-- setting completed_at. Those can be safely reclassified as EXPIRED.
UPDATE parties
SET
  status='EXPIRED',
  expired_at=COALESCE(expired_at,updated_at,now()),
  updated_at=now()
WHERE status='DONE'
  AND completed_at IS NULL
  AND start_time<=now();
