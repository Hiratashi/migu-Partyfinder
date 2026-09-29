-- Keep existing Discord delivery behavior unless a member turns it off.
ALTER TABLE users ADD COLUMN discord_notifications_enabled boolean NOT NULL DEFAULT true;
