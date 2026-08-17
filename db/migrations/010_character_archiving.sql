-- Soft-delete user characters while preserving party history.

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- The original schema creates UNIQUE(user_id, character_name).
-- Drop that full-history uniqueness so a user may later recreate a character
-- with the same name after archiving the old record.
ALTER TABLE characters
  DROP CONSTRAINT IF EXISTS characters_user_id_character_name_key;

DROP INDEX IF EXISTS characters_active_name_unique_idx;

CREATE UNIQUE INDEX characters_active_name_unique_idx
  ON characters(user_id, character_name)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS characters_user_active_idx
  ON characters(user_id)
  WHERE archived_at IS NULL;
