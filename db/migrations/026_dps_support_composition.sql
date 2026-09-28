-- New parties use a combined DPS/Support composition. Existing parties keep
-- their original physical/magical targets and behavior, including history.
ALTER TABLE parties
  ADD COLUMN composition_model text NOT NULL DEFAULT 'LEGACY'
    CHECK (composition_model IN ('LEGACY','DPS_SUPPORT')),
  ADD COLUMN need_dps int NOT NULL DEFAULT 0
    CHECK (need_dps BETWEEN 0 AND 12);
