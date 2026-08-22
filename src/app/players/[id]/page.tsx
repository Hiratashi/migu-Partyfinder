import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import ClassIcon from "@/components/ClassIcon";
import CopyCharacterName from "@/components/CopyCharacterName";
import PublicPlayerAvailability from "@/components/PublicPlayerAvailability";

const UUID=
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Player={
  id:string;
  username:string;
  display_name:string|null;
  avatar_url:string|null;
  profile_image_path:string|null;
};

type Capability={
  id:string;
  character_id:string;
  name:string;
  category:"DAMAGE"|"GEAR"|"UTILITY"|"OTHER";
  raid_id:string|null;
  raid_name:string|null;
  raid_sort_order:number|null;
  sort_order:number;
};

type Character={
  id:string;
  character_name:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
  armor_type:"TENEBROUS"|"EXASCALE"|null;
  exascale_color:"RED"|"BLUE"|"GREEN"|null;
};

const categoryLabel={
  DAMAGE:"Damage",
  GEAR:"Gear",
  UTILITY:"Utility",
  OTHER:"Other",
} as const;

export default async function PlayerProfile({
  params,
}:{
  params:Promise<{id:string}>;
}) {
  await requireUser();

  const {id}=await params;

  if(!UUID.test(id))notFound();

  const playerResult=await query<Player>(`
    SELECT
      id,
      username,
      display_name,
      avatar_url,
      profile_image_path
    FROM users
    WHERE id=$1
      AND access_disabled=false
    LIMIT 1
  `,[id]);

  const player=playerResult.rows[0];
  if(!player)notFound();

  const [characters,capabilities]=await Promise.all([
    query<Character>(`
      SELECT
        ch.id,
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
    `,[id]),
    query<Capability>(`
      SELECT
        ct.id,
        cc.character_id,
        ct.name,
        ct.category,
        ct.raid_id,
        r.name raid_name,
        r.sort_order raid_sort_order,
        ct.sort_order
      FROM character_capabilities cc
      JOIN capability_tags ct
        ON ct.id=cc.capability_tag_id
      JOIN characters ch
        ON ch.id=cc.character_id
      LEFT JOIN raids r
        ON r.id=ct.raid_id
      WHERE ch.user_id=$1
        AND ch.archived_at IS NULL
        AND ct.active=true
      ORDER BY
        cc.character_id,
        CASE WHEN ct.raid_id IS NULL THEN 0 ELSE 1 END,
        COALESCE(r.sort_order,0),
        ct.sort_order,
        ct.name
    `,[id]),
  ]);

  const capabilitiesByCharacter=new Map<string,Capability[]>();

  for(const capability of capabilities.rows) {
    const current=capabilitiesByCharacter.get(
      capability.character_id,
    )??[];

    current.push(capability);
    capabilitiesByCharacter.set(
      capability.character_id,
      current,
    );
  }

  const displayName=player.display_name??player.username;
  const imageUrl=player.profile_image_path
    ? `/api/profile/image/${encodeURIComponent(player.profile_image_path)}`
    : player.avatar_url;

  const initial=
    (displayName.trim()[0]??player.username.trim()[0]??"?")
      .toUpperCase();

  return <main className="public-player-profile">
    <section className="card public-profile-hero">
      <div className="public-profile-avatar-wrap">
        {imageUrl
          ? <img
              className="profile-avatar public-profile-avatar"
              src={imageUrl}
              alt={`${displayName} profile picture`}
            />
          : <div
              className="profile-avatar profile-avatar-fallback public-profile-avatar"
              aria-hidden="true"
            >
              {initial}
            </div>
        }
      </div>

      <div className="public-profile-identity">
        <div className="eyebrow">Player profile</div>
        <h1>{displayName}</h1>
        <div className="muted">@{player.username}</div>
      </div>
    </section>

    <section className="card public-profile-section">
      <div className="public-profile-section-header">
        <div className="eyebrow">Raid characters</div>
        <h2>Characters</h2>
      </div>

      {characters.rows.length===0
        ? <div className="muted">
            This player has no active characters.
          </div>
        : <div className="grid public-profile-character-grid">
            {characters.rows.map(character=>{
              const assigned=
                capabilitiesByCharacter.get(character.id)??[];

              const global=assigned.filter(
                capability=>capability.raid_id===null,
              );

              const raidGroups=new Map<string,{
                name:string;
                items:Capability[];
              }>();

              for(const capability of assigned) {
                if(!capability.raid_id)continue;

                const group=raidGroups.get(capability.raid_id)??{
                  name:capability.raid_name??"Raid",
                  items:[],
                };

                group.items.push(capability);
                raidGroups.set(capability.raid_id,group);
              }

              return <article
                className="public-profile-character public-profile-character-with-capabilities"
                key={character.id}
              >
                <ClassIcon
                  src={character.icon_path}
                  abbreviation={character.abbreviation}
                  name={character.name}
                />

                <div className="public-profile-character-copy">
                  <strong>
                    <CopyCharacterName name={character.character_name}/>
                  </strong>

                  <div className="muted">
                    {character.name} &middot; {character.damage_type} &middot; {character.role}
                  </div>

                  {character.armor_type&&
                    <div className="character-armor-public">
                      <span className="public-character-capability-tag">
                        {character.armor_type==="TENEBROUS"
                          ? "Tenebrous"
                          : `Exascale · ${
                              character.exascale_color
                                ? character.exascale_color[0]+
                                  character.exascale_color.slice(1).toLowerCase()
                                : ""
                            }`}
                      </span>
                    </div>
                  }

                  {assigned.length>0&&
                    <div className="public-character-capabilities">
                      {global.length>0&&
                        <div className="public-character-capability-group">
                          <span className="public-character-capability-scope">
                            Global
                          </span>

                          <div className="public-character-capability-tags">
                            {global.map(capability=>
                              <span
                                className="public-character-capability-tag"
                                key={capability.id}
                                title={categoryLabel[capability.category]}
                              >
                                {capability.name}
                              </span>
                            )}
                          </div>
                        </div>
                      }

                      {[...raidGroups.entries()].map(([raidId,group])=>
                        <div
                          className="public-character-capability-group"
                          key={raidId}
                        >
                          <span className="public-character-capability-scope">
                            {group.name}
                          </span>

                          <div className="public-character-capability-tags">
                            {group.items.map(capability=>
                              <span
                                className="public-character-capability-tag"
                                key={capability.id}
                                title={categoryLabel[capability.category]}
                              >
                                {capability.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  }
                </div>
              </article>;
            })}
          </div>
      }
    </section>

    <PublicPlayerAvailability userId={player.id}/>
  </main>;
}
