-- Periodic Discord guild-membership reconciliation without a bot.
-- OAuth tokens are encrypted by the application before being stored.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_disabled_reason varchar(32),
  ADD COLUMN IF NOT EXISTS guild_membership_checked_at timestamptz;

CREATE TABLE IF NOT EXISTS discord_oauth_tokens (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token_enc text NOT NULL,
  refresh_token_enc text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_guild_membership_checked_idx
  ON users(guild_membership_checked_at);

-- Existing admin-disabled accounts predate the reason field.
UPDATE users
SET access_disabled_reason='ADMIN'
WHERE access_disabled=true
  AND access_disabled_reason IS NULL;
