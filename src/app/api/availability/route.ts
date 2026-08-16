import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { availabilitySchema } from "@/data/validation";
import { db, query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({error:"bad_origin"},{status:403});
  const user = await currentUser(); if (!user) return NextResponse.json({error:"unauthorized"},{status:401});
  const parsed = availabilitySchema.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:"invalid_input",issues:parsed.error.issues},{status:400});
  const d = parsed.data;
  const raid = await query<{id:string}>("SELECT id FROM raids WHERE slug='doom-aporia' AND active=true LIMIT 1");
  if (!raid.rowCount) return NextResponse.json({error:"raid_unavailable"},{status:503});
  const enc = await query("SELECT id FROM encounters WHERE raid_id=$1 AND id=ANY($2::uuid[])",[raid.rows[0].id,d.encounters]);
  if (enc.rowCount !== d.encounters.length) return NextResponse.json({error:"invalid_encounter"},{status:400});
  const chars = await query("SELECT id FROM characters WHERE user_id=$1 AND id=ANY($2::uuid[])",[user.id,d.characterIds]);
  if (chars.rowCount !== d.characterIds.length) return NextResponse.json({error:"invalid_character"},{status:400});

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const a = await client.query<{id:string}>(`INSERT INTO availabilities(user_id,raid_id,start_time,end_time,min_difficulty,max_difficulty,practice_ok,notes)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[user.id,raid.rows[0].id,d.startTime,d.endTime,d.minDifficulty,d.maxDifficulty,d.practiceOk,d.notes||null]);
    for (const id of d.encounters) await client.query('INSERT INTO availability_encounters(availability_id,encounter_id) VALUES($1,$2)',[a.rows[0].id,id]);
    for (const id of d.characterIds) await client.query('INSERT INTO availability_characters(availability_id,character_id) VALUES($1,$2)',[a.rows[0].id,id]);
    await client.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'AVAILABILITY_CREATE','availability',$2)",[user.id,a.rows[0].id]);
    await client.query('COMMIT');
    return NextResponse.json({ok:true,id:a.rows[0].id});
  } catch(e) { await client.query('ROLLBACK'); console.error(e); return NextResponse.json({error:'server_error'},{status:500}); }
  finally { client.release(); }
}
