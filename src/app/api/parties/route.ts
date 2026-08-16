import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/security";
import { currentUser } from "@/lib/auth";
import { partySchema } from "@/data/validation";
import { db, query } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({error:"bad_origin"},{status:403});
  const user = await currentUser(); if (!user) return NextResponse.json({error:"unauthorized"},{status:401});
  const parsed = partySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error:"invalid_input",issues:parsed.error.issues},{status:400});
  const d = parsed.data;
  const raid = await query<{id:string}>("SELECT id FROM raids WHERE slug='doom-aporia' AND active=true LIMIT 1");
  if (!raid.rowCount) return NextResponse.json({error:"raid_unavailable"},{status:503});
  const allowed = await query<{id:string}>("SELECT id FROM encounters WHERE raid_id=$1 AND id = ANY($2::uuid[])",[raid.rows[0].id,d.encounters]);
  if (allowed.rowCount !== d.encounters.length) return NextResponse.json({error:"invalid_encounter"},{status:400});

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const party = await client.query<{id:string}>(`INSERT INTO parties(raid_id,leader_id,title,start_time,end_time,difficulty_stage,is_practice,practice_encounter_id,need_physical,need_magical,need_support)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,[raid.rows[0].id,user.id,d.title || null,d.startTime,d.endTime ?? null,d.difficultyStage,d.isPractice,d.practiceEncounterId ?? null,d.needPhysical,d.needMagical,d.needSupport]);
    for (const encounterId of d.encounters) await client.query('INSERT INTO party_encounters(party_id,encounter_id) VALUES($1,$2)',[party.rows[0].id,encounterId]);
    await client.query("INSERT INTO party_members(party_id,user_id,status) VALUES($1,$2,'ACCEPTED')",[party.rows[0].id,user.id]);
    await client.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'PARTY_CREATE','party',$2)",[user.id,party.rows[0].id]);
    await client.query('COMMIT');
    return NextResponse.json({ok:true,id:party.rows[0].id});
  } catch(e) { await client.query('ROLLBACK'); console.error(e); return NextResponse.json({error:'server_error'},{status:500}); }
  finally { client.release(); }
}
