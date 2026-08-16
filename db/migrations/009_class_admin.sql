-- Class administration ordering.
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

UPDATE classes SET sort_order=10 WHERE slug='shakti';
UPDATE classes SET sort_order=20 WHERE slug='code-sariel';
UPDATE classes SET sort_order=30 WHERE slug='radiant-soul';
