import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { partySchema } from "@/data/validation";
import { db, query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { getRaidById, raidSupportsStage } from "@/lib/raids";

export async function PATCH(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const user=await currentUser();
  if(!user) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  const {id}=await params;
  const parsed=partySchema.safeParse(
    await req.json().catch(()=>null),
  );

  if(!parsed.success) {
    return NextResponse.json(
      {error:"invalid_input",issues:parsed.error.issues},
      {status:400},
    );
  }

  const owned=await query<{raid_id:string}>(`
    SELECT raid_id
    FROM parties
    WHERE id=$1
      AND leader_id=$2
      AND status IN ('OPEN','FULL')
  `,[id,user.id]);

  if(!owned.rowCount) {
    return NextResponse.json({error:"forbidden"},{status:403});
  }

  const raid=await getRaidById(owned.rows[0].raid_id);
  if(!raid) {
    return NextResponse.json({error:"raid_unavailable"},{status:404});
  }

  const d=parsed.data;

  if(!raidSupportsStage(raid,d.difficultyStage)) {
    return NextResponse.json(
      {error:"unsupported_stage"},
      {status:400},
    );
  }

  if(d.isPractice&&!raid.practice_supported) {
    return NextResponse.json(
      {error:"practice_not_supported"},
      {status:400},
    );
  }

  if(
    d.needPhysical+d.needMagical+d.needSupport >
    raid.party_size
  ) {
    return NextResponse.json(
      {error:"composition_exceeds_party_size"},
      {status:400},
    );
  }

  const allEncounterIds=[
    ...new Set([...d.encounters,...d.practiceEncounterIds]),
  ];

  const allowed=await query(`
    SELECT id
    FROM encounters
    WHERE raid_id=$1
      AND id=ANY($2::uuid[])
  `,[raid.id,allEncounterIds]);

  if(allowed.rowCount!==allEncounterIds.length) {
    return NextResponse.json({error:"invalid_encounter"},{status:400});
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      UPDATE parties
      SET
        title=$1,
        start_time=$2,
        end_time=$3,
        difficulty_stage=$4,
        is_practice=$5,
        practice_encounter_id=NULL,
        need_physical=$6,
        need_magical=$7,
        need_support=$8,
        composition_restricted=$9,
        updated_at=now()
      WHERE id=$10
    `,[
      d.title||null,
      d.startTime,
      d.endTime??null,
      d.difficultyStage,
      d.isPractice,
      d.needPhysical,
      d.needMagical,
      d.needSupport,
      d.compositionRestricted,
      id,
    ]);

    await client.query(
      "DELETE FROM party_encounters WHERE party_id=$1",
      [id],
    );
    await client.query(
      "DELETE FROM party_practice_encounters WHERE party_id=$1",
      [id],
    );

    for(const e of d.encounters) {
      await client.query(
        "INSERT INTO party_encounters(party_id,encounter_id) VALUES($1,$2)",
        [id,e],
      );
    }

    for(const e of d.practiceEncounterIds) {
      await client.query(
        "INSERT INTO party_practice_encounters(party_id,encounter_id) VALUES($1,$2)",
        [id,e],
      );
    }

    await client.query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'PARTY_EDIT','party',$2)",
      [user.id,id],
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
