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

type Character={
  id:string;
  character_name:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
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

  if(!validTimeZone(viewerTimeZone)) {
    return NextResponse.json(
      {error:"invalid_timezone"},
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

  const [characters,slots]=await Promise.all([
    query<Character>(`
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
      LIMIT 6
    `,[id]),
    query<PublicWeeklySlot>(`
      SELECT day_of_week,minute_of_day
      FROM availability_user_weekly_slots
      WHERE user_id=$1
      ORDER BY day_of_week,minute_of_day
    `,[id]),
  ]);

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
    characters:characters.rows,
    availability,
  });
}
