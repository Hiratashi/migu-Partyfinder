ALTER TABLE raids
  ADD COLUMN discord_dps_role_id text CHECK (discord_dps_role_id IS NULL OR discord_dps_role_id ~ '^[0-9]{17,20}$'),
  ADD COLUMN discord_support_role_id text CHECK (discord_support_role_id IS NULL OR discord_support_role_id ~ '^[0-9]{17,20}$');

ALTER TABLE parties
  ADD COLUMN discord_announce boolean NOT NULL DEFAULT true,
  ADD COLUMN discord_ping_roles boolean NOT NULL DEFAULT true;

ALTER TABLE discord_party_announcements
  ADD COLUMN revision bigint NOT NULL DEFAULT 0;

CREATE FUNCTION queue_party_roster_announcement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_party uuid;
DECLARE changed boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_party := OLD.party_id;
    changed := OLD.status = 'ACCEPTED';
  ELSIF TG_OP = 'INSERT' THEN
    target_party := NEW.party_id;
    changed := NEW.status = 'ACCEPTED';
  ELSE
    target_party := NEW.party_id;
    changed := (NEW.status,NEW.character_id,NEW.group_number)
      IS DISTINCT FROM (OLD.status,OLD.character_id,OLD.group_number);
  END IF;
  IF changed THEN
    UPDATE discord_party_announcements
    SET revision=revision+1, delivered_at=NULL, stopped_at=NULL,
        next_attempt_at=now()
    WHERE party_id=target_party;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD;
  ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER party_roster_discord_refresh
  AFTER INSERT OR UPDATE OR DELETE ON party_members
  FOR EACH ROW EXECUTE FUNCTION queue_party_roster_announcement();

CREATE FUNCTION queue_party_status_announcement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE discord_party_announcements
  SET revision=revision+1, delivered_at=NULL, stopped_at=NULL,
      next_attempt_at=now()
  WHERE party_id=NEW.id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER party_status_discord_refresh
  AFTER UPDATE OF status,title,start_time,need_dps,need_support ON parties
  FOR EACH ROW WHEN ((OLD.status,OLD.title,OLD.start_time,OLD.need_dps,OLD.need_support)
    IS DISTINCT FROM (NEW.status,NEW.title,NEW.start_time,NEW.need_dps,NEW.need_support))
  EXECUTE FUNCTION queue_party_status_announcement();
