-- Raid ordering + Serpentium + temporary Abyss test raid.

ALTER TABLE raids
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

UPDATE raids
SET sort_order = 30
WHERE slug = 'doom-aporia';

INSERT INTO raids(
  slug,
  name,
  party_size,
  supported_stages,
  default_stage,
  practice_supported,
  active,
  sort_order
)
VALUES(
  'serpentium',
  'Serpentium Raid',
  6,
  ARRAY[2,3]::smallint[],
  3,
  true,
  true,
  20
)
ON CONFLICT(slug)
DO UPDATE SET
  name = EXCLUDED.name,
  party_size = EXCLUDED.party_size,
  supported_stages = EXCLUDED.supported_stages,
  default_stage = EXCLUDED.default_stage,
  practice_supported = EXCLUDED.practice_supported,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

WITH raid AS (
  SELECT id FROM raids WHERE slug='serpentium'
)
INSERT INTO encounters(raid_id,code,name,sort_order)
SELECT raid.id,v.code,v.name,v.sort_order
FROM raid
CROSS JOIN (
  VALUES
    ('Serpentium Tower','Serpentium Tower',1),
    ('Concert Hall','Concert Hall',2)
) AS v(code,name,sort_order)
ON CONFLICT(raid_id,code)
DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- Temporary 4-player architecture test raid.
-- This intentionally uses the generic Full Run behavior even though
-- the real Abyss progression has an either/or branch between 18-2 and 18-3.
INSERT INTO raids(
  slug,
  name,
  party_size,
  supported_stages,
  default_stage,
  practice_supported,
  active,
  sort_order
)
VALUES(
  'abyss-test',
  'Abyss Raid (Test)',
  4,
  ARRAY[1]::smallint[],
  1,
  true,
  true,
  10
)
ON CONFLICT(slug)
DO UPDATE SET
  name = EXCLUDED.name,
  party_size = EXCLUDED.party_size,
  supported_stages = EXCLUDED.supported_stages,
  default_stage = EXCLUDED.default_stage,
  practice_supported = EXCLUDED.practice_supported,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

WITH raid AS (
  SELECT id FROM raids WHERE slug='abyss-test'
)
INSERT INTO encounters(raid_id,code,name,sort_order)
SELECT raid.id,v.code,v.name,v.sort_order
FROM raid
CROSS JOIN (
  VALUES
    ('18-1','Sunken Holy Ground',1),
    ('18-2','Blooming Mineral Field',2),
    ('18-3','Nightmare''s Crib',3),
    ('18-4','Birth of Origin',4)
) AS v(code,name,sort_order)
ON CONFLICT(raid_id,code)
DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;
