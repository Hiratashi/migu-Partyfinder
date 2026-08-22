-- Structured character armor setup.
--
-- Tenebrous and Exascale are mutually exclusive. Exascale additionally
-- requires exactly one color selection.
--
-- The earlier capability definitions remain in the database for history,
-- but are deactivated so new selections use the structured armor fields.

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS armor_type text,
  ADD COLUMN IF NOT EXISTS exascale_color text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname='characters_armor_type_check'
  ) THEN
    ALTER TABLE characters
      ADD CONSTRAINT characters_armor_type_check
      CHECK (
        armor_type IS NULL
        OR armor_type IN ('TENEBROUS','EXASCALE')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname='characters_exascale_color_check'
  ) THEN
    ALTER TABLE characters
      ADD CONSTRAINT characters_exascale_color_check
      CHECK (
        (
          armor_type='EXASCALE'
          AND exascale_color IS NOT NULL
          AND exascale_color IN ('RED','BLUE','GREEN')
        )
        OR (
          armor_type IS DISTINCT FROM 'EXASCALE'
          AND exascale_color IS NULL
        )
      );
  END IF;
END
$$;

UPDATE capability_tags
SET
  active=false,
  updated_at=now()
WHERE slug IN ('green-exascale','tenebrous');
