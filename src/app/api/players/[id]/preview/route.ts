import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  availabilityRangesForViewer,
  type PublicWeeklySlot,
} from "@/lib/public-availability";

const UUID=
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validTimeZone(value:string) {
  try {
    new Intl.DateTimeFormat("en",{timeZone:value}).format(new Date());
    return true;
  } catch {
    return false;
  }
}

type Player={
  id:string;
  username:string;
  display_name:string|null;
  avatar_url:string|null;
  profile_image_path:string|null;
  timezone:string;
};

type Capability={
  id:string;
  character_id:string;
  name:string;
  category:"DAMAGE"|"GEAR"|"UTILITY"|"OTHER";
  raid_id:string|null;
  raid_name:string|null;
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
  capabilities?:Capability[];
};

export async function GET(
  req:NextRequest,
  {
    params,
  }:{
    params:Promise<{id:string}>;
  },
) {
  const viewer=await currentUser();

  if(!viewer) {
    return NextResponse.json(
      {error:"unauthorized"},
      {status:401},
    );
  }

  const {id}=await params;

  if(!UUID.test(id)) {
    return NextResponse.json(
      {error:"not_found"},
      {status:404},
    );
  }

  const viewerTimeZone=
    req.nextUrl.searchParams.get("timezone")??"";
  const raidId=
    req.nextUrl.searchParams.get("raidId")??"";

  if(!validTimeZone(viewerTimeZone)) {
    return NextResponse.json(
      {error:"invalid_timezone"},
      {status:400},
    );
  }

  if(raidId&&!UUID.test(raidId)) {
    return NextResponse.json(
      {error:"invalid_raid"},
      {status:400},
    );
  }

  const playerResult=await query<Player>(`
    SELECT
      id,
      username,
      display_name,
      avatar_url,
      profile_image_path,
      timezone
    FROM users
    WHERE id=$1
      AND access_disabled=false
    LIMIT 1
  `,[id]);

  const player=playerResult.rows[0];

  if(!player) {
    return NextResponse.json(
      {error:"not_found"},
      {status:404},
    );
  }

  const characterQuery=raidId
    ? query<Character>(`
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
        FROM availability_profiles ap
        JOIN availability_profile_characters apc
          ON apc.profile_id=ap.id
        JOIN characters ch
          ON ch.id=apc.character_id
         AND ch.user_id=ap.user_id
        JOIN classes c
          ON c.id=ch.class_id
        WHERE ap.user_id=$1
          AND ap.raid_id=$2
          AND ap.enabled=true
          AND ch.archived_at IS NULL
        ORDER BY ch.character_name
      `,[id,raidId])
    : query<Character>(`
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
      `,[id]);

  const capabilityQuery=raidId
    ? query<Capability>(`
        SELECT
          ct.id,
          cc.character_id,
          ct.name,
          ct.category,
          ct.raid_id,
          r.name raid_name,
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
          AND (
            ct.raid_id IS NULL
            OR ct.raid_id=$2
          )
        ORDER BY
          cc.character_id,
          CASE WHEN ct.raid_id IS NULL THEN 0 ELSE 1 END,
          ct.sort_order,
          ct.name
      `,[id,raidId])
    : query<Capability>(`
        SELECT
          ct.id,
          cc.character_id,
          ct.name,
          ct.category,
          ct.raid_id,
          r.name raid_name,
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
          ct.sort_order,
          ct.name
      `,[id]);

  const [characters,capabilities,slots]=await Promise.all([
    characterQuery,
    capabilityQuery,
    query<PublicWeeklySlot>(`
      SELECT day_of_week,minute_of_day
      FROM availability_user_weekly_slots
      WHERE user_id=$1
      ORDER BY day_of_week,minute_of_day
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

  const previewCharacters=characters.rows.map(character=>({
    ...character,
    capabilities:
      capabilitiesByCharacter.get(character.id)??[],
  }));

  const availability=availabilityRangesForViewer(
    slots.rows,
    player.timezone,
    viewerTimeZone,
  );

  const displayName=
    player.display_name??player.username;

  const profileImageUrl=player.profile_image_path
    ? `/api/profile/image/${encodeURIComponent(player.profile_image_path)}`
    : player.avatar_url;

  return NextResponse.json({
    id:player.id,
    displayName,
    username:player.username,
    profileImageUrl,
    characters:previewCharacters,
    availability,
  });
}
