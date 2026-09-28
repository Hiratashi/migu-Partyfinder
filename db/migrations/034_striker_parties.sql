-- Raid settings apply to new parties; existing parties retain their layout.
ALTER TABLE raids ADD COLUMN group_count smallint NOT NULL DEFAULT 1
  CHECK (group_count IN (1,2));
ALTER TABLE raids ADD CONSTRAINT raids_group_capacity_check
  CHECK (group_count=1 OR (party_size=8 AND group_count=2));

ALTER TABLE parties ADD COLUMN group_count smallint NOT NULL DEFAULT 1
  CHECK (group_count IN (1,2));
ALTER TABLE parties ADD CONSTRAINT parties_group_capacity_check
  CHECK (group_count=1 OR group_count=2);

-- NULL means awaiting leader assignment. Invitations do not occupy a group.
ALTER TABLE party_members ADD COLUMN group_number smallint
  CHECK (group_number IN (1,2));

ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN (
    'PARTY_INVITATION','PARTY_CHANGED','PARTY_CLOSED','PARTY_REMOVED',
    'PARTY_JOINED','PARTY_LEFT','PARTY_FULL','PARTY_CHARACTER_CHANGED',
    'PARTY_GROUP_CHANGED'
  ));
