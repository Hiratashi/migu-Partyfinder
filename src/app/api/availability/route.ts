import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { globalAvailabilitySchema } from "@/data/validation";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

export async function PUT(req:NextRequest) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  const user=await currentUser();
  if(!user) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  const parsed=globalAvailabilitySchema.safeParse(
    await req.json().catch(()=>null),
  );

  if(!parsed.success) {
    return NextResponse.json(
      {error:"invalid_input",issues:parsed.error.issues},
      {status:400},
    );
  }

  const d=parsed.data;

  try {
    new Intl.DateTimeFormat("en",{
      timeZone:d.timezone,
    }).format(new Date());
  } catch {
    return NextResponse.json(
      {error:"invalid_timezone"},
      {status:400},
    );
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE users SET timezone=$1,updated_at=now() WHERE id=$2",
      [d.timezone,user.id],
    );

    await client.query(
      "DELETE FROM availability_user_weekly_slots WHERE user_id=$1",
      [user.id],
    );

    for(const slot of d.slots) {
      await client.query(
        "INSERT INTO availability_user_weekly_slots(user_id,day_of_week,minute_of_day) VALUES($1,$2,$3)",
        [user.id,slot.day,slot.minute],
      );
    }

    await client.query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'AVAILABILITY_SAVE','user',$2,jsonb_build_object('scope','global','slot_count',$3::int))",
      [user.id,user.id,d.slots.length],
    );

    await client.query("COMMIT");
    return NextResponse.json({ok:true});
  } catch(e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  } finally {
    client.release();
  }
}
