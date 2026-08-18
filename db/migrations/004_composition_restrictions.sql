ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS composition_restricted boolean NOT NULL DEFAULT true;
