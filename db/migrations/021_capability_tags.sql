-- Character capability tags for player profiles and party matching.
--
-- A capability definition can be global (raid_id IS NULL) or specific to
-- one raid. Assignments always belong to one concrete character.

CREATE TABLE IF NOT EXISTS capability_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'OTHER'
    CHECK (category IN ('DAMAGE','GEAR','UTILITY','OTHER')),
  raid_id uuid REFERENCES raids(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100
    CHECK (sort_order BETWEEN 0 AND 9999),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS capability_tags_raid_id_idx
  ON capability_tags(raid_id);

CREATE INDEX IF NOT EXISTS capability_tags_active_sort_idx
  ON capability_tags(active,sort_order,name);

CREATE TABLE IF NOT EXISTS character_capabilities (
  character_id uuid NOT NULL
    REFERENCES characters(id) ON DELETE CASCADE,
  capability_tag_id uuid NOT NULL
    REFERENCES capability_tags(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id,capability_tag_id)
);

CREATE INDEX IF NOT EXISTS character_capabilities_tag_idx
  ON character_capabilities(capability_tag_id);
