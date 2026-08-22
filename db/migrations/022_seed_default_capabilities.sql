-- Seed the default capability catalogue used by Migu's Partyfinder.
--
-- These are normal capability definitions after creation: admins may rename,
-- re-scope, reorder, deactivate, or otherwise manage them through the UI.
--
-- Slugs are stable identifiers, so this migration is safe to re-run.

INSERT INTO capability_tags(
  slug,
  name,
  description,
  category,
  raid_id,
  active,
  sort_order
)
VALUES
  (
    'green-exascale',
    'Green Exascale',
    'Character can bring a Green Exascale setup.',
    'GEAR',
    NULL,
    true,
    100
  ),
  (
    'tenebrous',
    'Tenebrous',
    'Character can bring a Tenebrous setup.',
    'GEAR',
    NULL,
    true,
    110
  ),
  (
    'black-mass',
    'Black Mass',
    'Character can provide Black Mass.',
    'UTILITY',
    NULL,
    true,
    200
  ),
  (
    'white-mass',
    'White Mass',
    'Character can provide White Mass.',
    'UTILITY',
    NULL,
    true,
    210
  ),
  (
    'ascending-dragon',
    'Ascending Dragon',
    'Character can provide Ascending Dragon.',
    'UTILITY',
    NULL,
    true,
    220
  ),
  (
    'mysterious-el-lord-crown',
    'Mysterious El Lord Crown',
    'Character can bring Mysterious El Lord Crown.',
    'GEAR',
    NULL,
    true,
    300
  ),
  (
    'mysterious-el-lord-cuff',
    'Mysterious El Lord Cuff',
    'Character can bring Mysterious El Lord Cuff.',
    'GEAR',
    NULL,
    true,
    310
  ),
  (
    'chronicle',
    'Chronicle',
    'Character can bring Chronicle.',
    'GEAR',
    NULL,
    true,
    320
  )
ON CONFLICT(slug) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  category=EXCLUDED.category,
  raid_id=EXCLUDED.raid_id,
  active=EXCLUDED.active,
  sort_order=EXCLUDED.sort_order,
  updated_at=now();

DO $$
DECLARE
  doom_raid_id uuid;
BEGIN
  SELECT id
  INTO doom_raid_id
  FROM raids
  WHERE slug='doom-aporia';

  IF doom_raid_id IS NULL THEN
    RAISE EXCEPTION
      'Cannot seed Doom DPS capability: raid slug doom-aporia was not found';
  END IF;

  INSERT INTO capability_tags(
    slug,
    name,
    description,
    category,
    raid_id,
    active,
    sort_order
  )
  VALUES(
    'doom-dps',
    'Doom DPS',
    'Character is intended as a meaningful damage dealer for Doom Aporia.',
    'DAMAGE',
    doom_raid_id,
    true,
    100
  )
  ON CONFLICT(slug) DO UPDATE SET
    name=EXCLUDED.name,
    description=EXCLUDED.description,
    category=EXCLUDED.category,
    raid_id=EXCLUDED.raid_id,
    active=EXCLUDED.active,
    sort_order=EXCLUDED.sort_order,
    updated_at=now();
END
$$;
