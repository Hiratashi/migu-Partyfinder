ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN (
    'PARTY_INVITATION','PARTY_CHANGED','PARTY_CLOSED','PARTY_REMOVED',
    'PARTY_JOINED','PARTY_LEFT','PARTY_FULL'
  ));
