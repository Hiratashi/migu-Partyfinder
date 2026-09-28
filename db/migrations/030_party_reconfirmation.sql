-- A pending response occupies the existing ACCEPTED seat. The membership FK
-- removes pending responses when a member leaves or is removed.
CREATE TABLE party_reconfirmations (
  party_id uuid NOT NULL,
  user_id uuid NOT NULL,
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  change_details jsonb NOT NULL CHECK (jsonb_typeof(change_details)='array'),
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(party_id,user_id),
  FOREIGN KEY(party_id,user_id) REFERENCES party_members(party_id,user_id) ON DELETE CASCADE
);

ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN ('PARTY_INVITATION','PARTY_CHANGED','PARTY_CLOSED','PARTY_REMOVED'));
