-- Remove the temporary Abyss architecture-test raid.
-- This intentionally removes all test parties and availability profiles
-- attached to the test raid before deleting the raid itself.

DO $$
DECLARE
  abyss_id uuid;
BEGIN
  SELECT id INTO abyss_id
  FROM raids
  WHERE slug = 'abyss-test';

  IF abyss_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM availability_profiles
  WHERE raid_id = abyss_id;

  DELETE FROM parties
  WHERE raid_id = abyss_id;

  DELETE FROM encounters
  WHERE raid_id = abyss_id;

  DELETE FROM raids
  WHERE id = abyss_id;
END $$;

UPDATE raids SET sort_order = 10 WHERE slug = 'serpentium';
UPDATE raids SET sort_order = 20 WHERE slug = 'doom-aporia';
