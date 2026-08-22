-- Clarify the Doom damage capability wording.
--
-- Keep the stable slug "doom-dps" so existing assignments remain valid.

UPDATE capability_tags
SET
  name='Doom Damage Ready',
  description=
    'Self-declared. Select this only if you are confident this character can be relied on as one of the party''s primary damage dealers in Doom Aporia and carry a meaningful share of the group''s damage.',
  updated_at=now()
WHERE slug='doom-dps';
