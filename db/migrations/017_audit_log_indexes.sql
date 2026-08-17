-- Audit viewer support.
-- Existing installations normally already have created_at, but keep this
-- migration tolerant of older development databases.

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_user_created_idx
  ON audit_log(user_id,created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_action_created_idx
  ON audit_log(action,created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_entity_created_idx
  ON audit_log(entity_type,entity_id,created_at DESC);
