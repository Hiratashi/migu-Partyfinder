-- User administration / access control.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE INDEX IF NOT EXISTS users_access_disabled_idx
  ON users(access_disabled);

CREATE INDEX IF NOT EXISTS users_last_login_at_idx
  ON users(last_login_at DESC);
