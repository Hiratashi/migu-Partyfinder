CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id text UNIQUE NOT NULL,
  username text NOT NULL,
  display_name text,
  avatar_url text,
  timezone text NOT NULL DEFAULT 'UTC',
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  abbreviation text NOT NULL,
  damage_type text NOT NULL CHECK (damage_type IN ('PHYSICAL','MAGICAL','HYBRID','NONE')),
  role text NOT NULL CHECK (role IN ('DPS','SUPPORT','FLEX')),
  icon_path text,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id),
  character_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, character_name)
);

CREATE TABLE IF NOT EXISTS raids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_id uuid NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL,
  UNIQUE(raid_id, code)
);

CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_id uuid NOT NULL REFERENCES raids(id),
  leader_id uuid NOT NULL REFERENCES users(id),
  title text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  difficulty_stage int NOT NULL CHECK (difficulty_stage BETWEEN 1 AND 99),
  is_practice boolean NOT NULL DEFAULT false,
  practice_encounter_id uuid REFERENCES encounters(id),
  need_physical int NOT NULL DEFAULT 0 CHECK (need_physical BETWEEN 0 AND 8),
  need_magical int NOT NULL DEFAULT 0 CHECK (need_magical BETWEEN 0 AND 8),
  need_support int NOT NULL DEFAULT 0 CHECK (need_support BETWEEN 0 AND 8),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','FULL','CANCELLED','DONE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parties_start_time_idx ON parties(start_time);

CREATE TABLE IF NOT EXISTS party_encounters (
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  encounter_id uuid NOT NULL REFERENCES encounters(id),
  PRIMARY KEY (party_id, encounter_id)
);

CREATE TABLE IF NOT EXISTS party_members (
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('INVITED','ACCEPTED','DECLINED')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
