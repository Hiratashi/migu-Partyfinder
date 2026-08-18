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

type Character={
  id:string;
  character_name:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
};

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

  const characters=await query<Character>(`
    SELECT
      ch.id,
      ch.character_name,
      c.name,
      c.abbreviation,
      c.damage_type,
      c.role,
      c.icon_path
    FROM characters ch
    JOIN classes c ON c.id=ch.class_id
    WHERE ch.user_id=$1
      AND ch.archived_at IS NULL
    ORDER BY ch.character_name
  `,[id]);

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
            {characters.rows.map(character=>
              <article
                className="public-profile-character"
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
                    {character.name} · {character.damage_type} · {character.role}
                  </div>
                </div>
              </article>
            )}
          </div>
      }
    </section>

    <PublicPlayerAvailability userId={player.id}/>
  </main>;
}
