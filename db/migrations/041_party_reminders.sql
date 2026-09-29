-- A member can choose their own lead time; NULL disables reminders.
ALTER TABLE users ADD COLUMN party_reminder_minutes integer DEFAULT 30
  CHECK (party_reminder_minutes BETWEEN 1 AND 10080);

-- Claim before inserting into the inbox so worker restarts cannot duplicate a reminder.
CREATE TABLE party_reminder_deliveries (
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  PRIMARY KEY (party_id,user_id,start_time)
);

ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN (
    'PARTY_INVITATION','PARTY_CHANGED','PARTY_CLOSED','PARTY_REMOVED',
    'PARTY_JOINED','PARTY_LEFT','PARTY_FULL','PARTY_CHARACTER_CHANGED',
    'PARTY_GROUP_CHANGED','PARTY_REMINDER'
  ));
