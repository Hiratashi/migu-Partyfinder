-- Party lifecycle timestamps
ALTER TABLE parties ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Availability windows. Multiple rows = multiple possible time slots.
CREATE TABLE IF NOT EXISTS availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raid_id uuid NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  min_difficulty int NOT NULL DEFAULT 1 CHECK (min_difficulty BETWEEN 1 AND 99),
  max_difficulty int NOT NULL DEFAULT 99 CHECK (max_difficulty BETWEEN 1 AND 99),
  practice_ok boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (max_difficulty >= min_difficulty)
);
CREATE INDEX IF NOT EXISTS availabilities_user_idx ON availabilities(user_id);
CREATE INDEX IF NOT EXISTS availabilities_raid_time_idx ON availabilities(raid_id,start_time,end_time);

CREATE TABLE IF NOT EXISTS availability_encounters (
  availability_id uuid NOT NULL REFERENCES availabilities(id) ON DELETE CASCADE,
  encounter_id uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  PRIMARY KEY (availability_id, encounter_id)
);

CREATE TABLE IF NOT EXISTS availability_characters (
  availability_id uuid NOT NULL REFERENCES availabilities(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (availability_id, character_id)
);
