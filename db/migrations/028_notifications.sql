CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('PARTY_INVITATION','PARTY_CHANGED')),
  title text NOT NULL,
  body text NOT NULL,
  party_id uuid REFERENCES parties(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE(event_id,user_id)
);

CREATE INDEX notifications_user_created_idx ON notifications(user_id,created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications(user_id,created_at DESC) WHERE read_at IS NULL;
