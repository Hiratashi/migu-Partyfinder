-- Data-driven raid configuration.
ALTER TABLE raids
  ADD COLUMN IF NOT EXISTS supported_stages smallint[] NOT NULL DEFAULT ARRAY[3]::smallint[],
  ADD COLUMN IF NOT EXISTS default_stage smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS practice_supported boolean NOT NULL DEFAULT true;

UPDATE raids
SET
  supported_stages = ARRAY[1,2,3]::smallint[],
  default_stage = 3,
  practice_supported = true,
  party_size = 6
WHERE slug = 'doom-aporia';

ALTER TABLE raids
  DROP CONSTRAINT IF EXISTS raids_default_stage_check;

ALTER TABLE raids
  ADD CONSTRAINT raids_default_stage_check
  CHECK (default_stage BETWEEN 1 AND 99);
