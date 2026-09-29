-- Group moves do not change the public roster summary. Preserve website alerts.
CREATE OR REPLACE FUNCTION queue_party_roster_announcement() RETURNS trigger LANGUAGE plpgsql AS $$
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
    changed := (NEW.status,NEW.character_id)
      IS DISTINCT FROM (OLD.status,OLD.character_id);
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
