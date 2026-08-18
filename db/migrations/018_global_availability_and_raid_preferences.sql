-- Global weekly availability + per-raid enable/disable preferences.

ALTER TABLE availability_profiles
ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS availability_user_weekly_slots (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  minute_of_day smallint NOT NULL CHECK (
    minute_of_day BETWEEN 0 AND 1410
    AND minute_of_day % 30 = 0
  ),
  PRIMARY KEY (user_id, day_of_week, minute_of_day)
);

CREATE INDEX IF NOT EXISTS availability_user_weekly_slots_user_idx
ON availability_user_weekly_slots(user_id);

-- Preserve existing beta availability by merging all raid-specific schedules
-- into one global weekly schedule per user.
INSERT INTO availability_user_weekly_slots(
  user_id,
  day_of_week,
  minute_of_day
)
SELECT DISTINCT
  ap.user_id,
  aws.day_of_week,
  aws.minute_of_day
FROM availability_weekly_slots aws
JOIN availability_profiles ap
  ON ap.id = aws.profile_id
ON CONFLICT DO NOTHING;