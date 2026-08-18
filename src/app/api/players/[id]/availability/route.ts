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

  const owner=await query<{timezone:string}>(`
    SELECT timezone
    FROM users
    WHERE id=$1
      AND access_disabled=false
    LIMIT 1
  `,[id]);

  if(!owner.rowCount) {
    return NextResponse.json(
      {error:"not_found"},
      {status:404},
    );
  }

  const slots=await query<PublicWeeklySlot>(`
    SELECT day_of_week,minute_of_day
    FROM availability_user_weekly_slots
    WHERE user_id=$1
    ORDER BY day_of_week,minute_of_day
  `,[id]);

  const rows=availabilityRangesForViewer(
    slots.rows,
    owner.rows[0].timezone,
    viewerTimeZone,
  );

  return NextResponse.json({
    rows,
    viewerTimeZone,
  });
}
