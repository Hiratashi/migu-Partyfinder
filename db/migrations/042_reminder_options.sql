ALTER TABLE parties ADD COLUMN leader_incomplete_reminder_minutes integer DEFAULT 30
  CHECK (leader_incomplete_reminder_minutes BETWEEN 1 AND 10080);

ALTER TABLE party_reminder_deliveries ADD COLUMN kind text NOT NULL DEFAULT 'PARTY_REMINDER';
-- Existing queued deliveries remain ungrouped; future deliveries record their scheduled lead time.
ALTER TABLE party_reminder_deliveries ADD COLUMN reminder_minutes integer;
ALTER TABLE party_reminder_deliveries DROP CONSTRAINT party_reminder_deliveries_pkey;
ALTER TABLE party_reminder_deliveries ADD PRIMARY KEY (party_id,user_id,start_time,kind);

ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN (
    'PARTY_INVITATION','PARTY_CHANGED','PARTY_CLOSED','PARTY_REMOVED',
    'PARTY_JOINED','PARTY_LEFT','PARTY_FULL','PARTY_CHARACTER_CHANGED',
    'PARTY_GROUP_CHANGED','PARTY_REMINDER','PARTY_INCOMPLETE_REMINDER'
  ));
