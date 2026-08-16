-- Use standard dungeon numbers as Serpentium encounter codes.
-- Existing party/availability references use encounter UUIDs, so changing
-- the display code does not break existing records.

UPDATE encounters e
SET code = CASE e.name
  WHEN 'Serpentium Tower' THEN '20-4'
  WHEN 'Concert Hall' THEN '20-5'
  ELSE e.code
END
FROM raids r
WHERE e.raid_id = r.id
  AND r.slug = 'serpentium'
  AND e.name IN ('Serpentium Tower','Concert Hall');
