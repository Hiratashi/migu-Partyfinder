-- Delivery is optional. The website inbox remains the source of truth.
CREATE TABLE discord_notification_outbox (
  notification_id uuid PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  leased_until timestamptz,
  delivered_at timestamptz,
  stopped_at timestamptz,
  last_error text,
  discord_message_id text
);
CREATE INDEX discord_notification_outbox_ready_idx
  ON discord_notification_outbox(next_attempt_at)
  WHERE delivered_at IS NULL AND stopped_at IS NULL;

CREATE FUNCTION queue_discord_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO discord_notification_outbox(notification_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER notifications_queue_discord AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION queue_discord_notification();

-- Only new parties are public. Private invitations and edits use DMs.
CREATE TABLE discord_party_announcements (
  party_id uuid PRIMARY KEY REFERENCES parties(id) ON DELETE CASCADE,
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  leased_until timestamptz,
  delivered_at timestamptz,
  stopped_at timestamptz,
  last_error text,
  discord_message_id text
);
CREATE FUNCTION queue_discord_party() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO discord_party_announcements(party_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER parties_queue_discord AFTER INSERT ON parties
  FOR EACH ROW EXECUTE FUNCTION queue_discord_party();
