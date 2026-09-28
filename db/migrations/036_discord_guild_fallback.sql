-- Guild pings are opt-in because other members can see who is mentioned.
ALTER TABLE users ADD COLUMN discord_guild_alerts_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE discord_notification_outbox
  ADD COLUMN fallback_required boolean NOT NULL DEFAULT false,
  ADD COLUMN delivery_method text CHECK (delivery_method IN ('DM','GUILD'));
