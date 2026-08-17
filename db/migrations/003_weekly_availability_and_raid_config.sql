-- Raid-level party size. Doom Aporia currently uses 6 players.
ALTER TABLE raids ADD COLUMN IF NOT EXISTS party_size int NOT NULL DEFAULT 6 CHECK (party_size BETWEEN 1 AND 12);
UPDATE raids SET party_size = 6 WHERE slug = 'doom-aporia';

-- A practice party can target more than one encounter.
CREATE TABLE IF NOT EXISTS party_practice_encounters (
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  encounter_id uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  PRIMARY KEY (party_id, encounter_id)
);

-- Preserve any practice fight selected with the old single-value model.
INSERT INTO party_practice_encounters(party_id, encounter_id)
SELECT id, practice_encounter_id
FROM parties
WHERE practice_encounter_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- The old availability model was one row per dated window. The new model is one
-- persistent weekly profile per user/raid, so the legacy test tables are obsolete.
DROP TABLE IF EXISTS availability_characters CASCADE;
DROP TABLE IF EXISTS availability_encounters CASCADE;
DROP TABLE IF EXISTS availabilities CASCADE;

CREATE TABLE IF NOT EXISTS availability_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raid_id uuid NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  stages smallint[] NOT NULL DEFAULT ARRAY[3]::smallint[],
  practice_ok boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, raid_id)
);
CREATE INDEX IF NOT EXISTS availability_profiles_raid_idx ON availability_profiles(raid_id);

CREATE TABLE IF NOT EXISTS availability_profile_encounters (
  profile_id uuid NOT NULL REFERENCES availability_profiles(id) ON DELETE CASCADE,
  encounter_id uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, encounter_id)
);

CREATE TABLE IF NOT EXISTS availability_profile_characters (
  profile_id uuid NOT NULL REFERENCES availability_profiles(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, character_id)
);

-- Monday=0 ... Sunday=6. Each selected cell represents one 30-minute block.
CREATE TABLE IF NOT EXISTS availability_weekly_slots (
  profile_id uuid NOT NULL REFERENCES availability_profiles(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  minute_of_day smallint NOT NULL CHECK (minute_of_day BETWEEN 0 AND 1410 AND minute_of_day % 30 = 0),
  PRIMARY KEY (profile_id, day_of_week, minute_of_day)
);
CREATE INDEX IF NOT EXISTS availability_weekly_slots_profile_idx ON availability_weekly_slots(profile_id);
