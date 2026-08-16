import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { weeklyAvailabilitySchema } from "@/data/validation";
import { db, query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { getRaidBySlug } from "@/lib/raids";

export async function PUT(req:NextRequest) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const user=await currentUser();
  if(!user) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  const parsed=weeklyAvailabilitySchema.safeParse(
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

  const raid=await getRaidBySlug(d.raidSlug);
  if(!raid) {
    return NextResponse.json(
      {error:"raid_unavailable"},
      {status:404},
    );
  }

  if(d.stages.some(stage=>!raid.supported_stages.includes(stage))) {
    return NextResponse.json(
      {
        error:"unsupported_stage",
        message:`One or more selected stages are not supported by ${raid.name}.`,
      },
      {status:400},
    );
  }

  const enc=await query(`
    SELECT id
    FROM encounters
    WHERE raid_id=$1 AND id=ANY($2::uuid[])
  `,[raid.id,d.encounters]);

  if(enc.rowCount!==d.encounters.length) {
    return NextResponse.json(
      {error:"invalid_encounter"},
      {status:400},
    );
  }

  const chars=await query(`
    SELECT id
    FROM characters
    WHERE user_id=$1 AND archived_at IS NULL AND id=ANY($2::uuid[])
  `,[user.id,d.characterIds]);

  if(chars.rowCount!==d.characterIds.length) {
    return NextResponse.json(
      {error:"invalid_character"},
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

    const profile=await client.query<{id:string}>(`
      INSERT INTO availability_profiles(
        user_id,raid_id,stages,practice_ok,notes
      )
      VALUES($1,$2,$3::smallint[],$4,$5)
      ON CONFLICT(user_id,raid_id)
      DO UPDATE SET
        stages=EXCLUDED.stages,
        practice_ok=EXCLUDED.practice_ok,
        notes=EXCLUDED.notes,
        updated_at=now()
      RETURNING id
    `,[
      user.id,
      raid.id,
      d.stages,
      raid.practice_supported?d.practiceOk:false,
      d.notes||null,
    ]);

    const profileId=profile.rows[0].id;

    await client.query(
      "DELETE FROM availability_profile_encounters WHERE profile_id=$1",
      [profileId],
    );
    await client.query(
      "DELETE FROM availability_profile_characters WHERE profile_id=$1",
      [profileId],
    );
    await client.query(
      "DELETE FROM availability_weekly_slots WHERE profile_id=$1",
      [profileId],
    );

    for(const id of d.encounters) {
      await client.query(
        "INSERT INTO availability_profile_encounters(profile_id,encounter_id) VALUES($1,$2)",
        [profileId,id],
      );
    }

    for(const id of d.characterIds) {
      await client.query(
        "INSERT INTO availability_profile_characters(profile_id,character_id) VALUES($1,$2)",
        [profileId,id],
      );
    }

    for(const slot of d.slots) {
      await client.query(
        "INSERT INTO availability_weekly_slots(profile_id,day_of_week,minute_of_day) VALUES($1,$2,$3)",
        [profileId,slot.day,slot.minute],
      );
    }

    await client.query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'AVAILABILITY_SAVE','availability_profile',$2,jsonb_build_object('raid_slug',$3::text))",
      [user.id,profileId,raid.slug],
    );

    await client.query("COMMIT");
    return NextResponse.json({ok:true,id:profileId});
  } catch(e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  } finally {
    client.release();
  }
}
