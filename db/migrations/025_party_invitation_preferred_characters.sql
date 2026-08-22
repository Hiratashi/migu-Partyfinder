CREATE TABLE IF NOT EXISTS party_invitation_preferred_characters (
  party_id uuid NOT NULL,
  user_id uuid NOT NULL,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id,user_id,character_id),
  CONSTRAINT party_invitation_preferred_characters_invitation_fk
    FOREIGN KEY (party_id,user_id)
    REFERENCES party_members(party_id,user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
  party_invitation_preferred_characters_character_id_idx
ON party_invitation_preferred_characters(character_id);
