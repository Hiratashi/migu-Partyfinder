import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/security";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";
const bodySchema = z.object({characterId:z.string().uuid().nullable().optional()});

export async function POST(req: NextRequest, {params}:{params:Promise<{id:string}>}) {
  if (!sameOrigin(req)) return NextResponse.json({error:"bad_origin"},{status:403});
  const user = await currentUser(); if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  const {id} = await params;
  const body = bodySchema.safeParse(await req.json().catch(()=>({})));
  if (!body.success) return NextResponse.json({error:'invalid_input'},{status:400});
  if (body.data.characterId) {
    const c = await query('SELECT 1 FROM characters WHERE id=$1 AND user_id=$2',[body.data.characterId,user.id]);
    if (!c.rowCount) return NextResponse.json({error:'invalid_character'},{status:400});
  }
  const p = await query("SELECT 1 FROM parties WHERE id=$1 AND status='OPEN' AND start_time > now() - interval '6 hours'",[id]);
  if (!p.rowCount) return NextResponse.json({error:'party_unavailable'},{status:404});
  await query(`INSERT INTO party_members(party_id,user_id,character_id,status) VALUES($1,$2,$3,'ACCEPTED')
    ON CONFLICT(party_id,user_id) DO UPDATE SET character_id=EXCLUDED.character_id,status='ACCEPTED'`,[id,user.id,body.data.characterId ?? null]);
  return NextResponse.json({ok:true});
}
