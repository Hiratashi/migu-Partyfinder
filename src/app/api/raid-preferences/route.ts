import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { raidPreferenceSchema } from "@/data/validation";
import { db, query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { getRaidBySlug } from "@/lib/raids";
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

  const parsed=raidPreferenceSchema.safeParse(
    await req.json().catch(()=>null),
  );

  if(!parsed.success) {
    return NextResponse.json(
      {error:"invalid_input",issues:parsed.error.issues},
      {status:400},
    );
  }

  const d=parsed.data;

  const raid=await getRaidBySlug(d.raidSlug);
  if(!raid) {
    return NextResponse.json(
      {error:"raid_unavailable"},
      {status:404},
    );
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    // Disabling a raid intentionally preserves the existing preference details.
    // Re-enabling later can therefore restore the user's previous selections.
    if(!d.enabled) {
      const profile=await client.query<{id:string}>(`
        INSERT INTO availability_profiles(
          user_id,
          raid_id,
          enabled,
          stages,
          practice_ok,
          notes
        )
        VALUES($1,$2,false,$3::smallint[],false,NULL)
        ON CONFLICT(user_id,raid_id)
        DO UPDATE SET
          enabled=false,
          updated_at=now()
        RETURNING id
      `,[
        user.id,
        raid.id,
        [raid.default_stage],
      ]);

      const profileId=profile.rows[0].id;

      await client.query(
        "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'RAID_PREFERENCE_SAVE','availability_profile',$2,jsonb_build_object('raid_slug',$3::text,'enabled',false))",
        [user.id,profileId,raid.slug],
      );

      await client.query("COMMIT");
      return NextResponse.json({ok:true,id:profileId,enabled:false});
    }

    if(d.stages.some(stage=>!raid.supported_stages.includes(stage))) {
      await client.query("ROLLBACK");
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
      await client.query("ROLLBACK");
      return NextResponse.json(
        {error:"invalid_encounter"},
        {status:400},
      );
    }

    const chars=await query(`
      SELECT id
      FROM characters
      WHERE user_id=$1
        AND archived_at IS NULL
        AND id=ANY($2::uuid[])
    `,[user.id,d.characterIds]);

    if(chars.rowCount!==d.characterIds.length) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {error:"invalid_character"},
        {status:400},
      );
    }

    const profile=await client.query<{id:string}>(`
      INSERT INTO availability_profiles(
        user_id,
        raid_id,
        enabled,
        stages,
        practice_ok,
        notes
      )
      VALUES($1,$2,true,$3::smallint[],$4,$5)
      ON CONFLICT(user_id,raid_id)
      DO UPDATE SET
        enabled=true,
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

    await client.query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'RAID_PREFERENCE_SAVE','availability_profile',$2,jsonb_build_object('raid_slug',$3::text,'enabled',true))",
      [user.id,profileId,raid.slug],
    );

    await client.query("COMMIT");
    return NextResponse.json({ok:true,id:profileId,enabled:true});
  } catch(e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  } finally {
    client.release();
  }
}