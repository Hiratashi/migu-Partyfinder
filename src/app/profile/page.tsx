import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import CharacterForm from "@/components/CharacterForm";
import CharacterManager from "@/components/CharacterManager";
import ProfileIdentityCard from "@/components/ProfileIdentityCard";

type C={
  id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
  base_character:string;
  path_number:number;
};

type Ch={
  id:string;
  class_id:string;
  character_name:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
  armor_type:"TENEBROUS"|"EXASCALE"|null;
  exascale_color:"RED"|"BLUE"|"GREEN"|null;
};

type ProfileRow={
  profile_image_path:string|null;
};

type Capability={
  id:string;
  name:string;
  description:string;
  category:"DAMAGE"|"GEAR"|"UTILITY"|"OTHER";
  raid_id:string|null;
  raid_name:string|null;
  sort_order:number;
};

type CapabilityAssignment={
  character_id:string;
  capability_tag_id:string;
};

export default async function Profile() {
  const user=await requireUser();

  const [
    classes,
    chars,
    profile,
    capabilities,
    capabilityAssignments,
  ]=await Promise.all([
    query<C>(`
      SELECT
        id,name,abbreviation,damage_type,role,icon_path,
        base_character,path_number
      FROM classes
      WHERE active=true
      ORDER BY sort_order,name
    `),
    query<Ch>(`
      SELECT
        ch.id,
        ch.class_id,
        ch.character_name,
        c.name,
        c.abbreviation,
        c.damage_type,
        c.role,
        c.icon_path,
        ch.armor_type,
        ch.exascale_color
      FROM characters ch
      JOIN classes c ON c.id=ch.class_id
      WHERE ch.user_id=$1
        AND ch.archived_at IS NULL
      ORDER BY ch.character_name
    `,[user.id]),
    query<ProfileRow>(`
      SELECT profile_image_path
      FROM users
      WHERE id=$1
    `,[user.id]),
    query<Capability>(`
      SELECT
        ct.id,
        ct.name,
        ct.description,
        ct.category,
        ct.raid_id,
        r.name raid_name,
        ct.sort_order
      FROM capability_tags ct
      LEFT JOIN raids r ON r.id=ct.raid_id
      WHERE ct.active=true
      ORDER BY
        CASE WHEN ct.raid_id IS NULL THEN 0 ELSE 1 END,
        COALESCE(r.sort_order,0),
        ct.sort_order,
        ct.name
    `),
    query<CapabilityAssignment>(`
      SELECT
        cc.character_id,
        cc.capability_tag_id
      FROM character_capabilities cc
      JOIN capability_tags ct
        ON ct.id=cc.capability_tag_id
      JOIN characters ch
        ON ch.id=cc.character_id
      WHERE ch.user_id=$1
        AND ch.archived_at IS NULL
        AND ct.active=true
    `,[user.id]),
  ]);

  const capabilityIdsByCharacter=new Map<string,string[]>();

  for(const assignment of capabilityAssignments.rows) {
    const ids=capabilityIdsByCharacter.get(
      assignment.character_id,
    )??[];

    ids.push(assignment.capability_tag_id);
    capabilityIdsByCharacter.set(
      assignment.character_id,
      ids,
    );
  }

  const customImageFilename=
    profile.rows[0]?.profile_image_path??null;

  const customImageUrl=customImageFilename
    ? `/api/profile/image/${encodeURIComponent(customImageFilename)}`
    : null;

  return <main>
    <h1>Profile & characters</h1>
    <p className="muted">
      Manage how you appear to other players and the characters you can
      bring to raids.
    </p>

    <ProfileIdentityCard
      displayName={user.display_name??user.username}
      username={user.username}
      customImageUrl={customImageUrl}
      discordAvatarUrl={user.avatar_url}
    />

    <section className="profile-character-section">
      <div className="profile-section-heading">
        <div>
          <h2 className="section-title">Your characters</h2>
          <p className="muted">
            Add and manage the characters/classes you can bring to raids.
            Removed characters remain internally only when needed for
            party history.
          </p>
        </div>
      </div>

      <CharacterForm classes={classes.rows}/>

      <div className="grid character-grid profile-character-grid">
        {chars.rows.length===0&&
          <div className="card muted">
            You have not added any characters yet.
          </div>
        }

        {chars.rows.map(c=>
          <CharacterManager
            key={c.id}
            character={c}
            classes={classes.rows}
            capabilities={capabilities.rows}
            selectedCapabilityIds={
              capabilityIdsByCharacter.get(c.id)??[]
            }
          />
        )}
      </div>
    </section>
  </main>;
}
