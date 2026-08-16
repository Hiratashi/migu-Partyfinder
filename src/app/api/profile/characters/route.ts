import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/security";
import { currentUser } from "@/lib/auth";
import { characterSchema } from "@/data/validation";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({error:"bad_origin"},{status:403});
  const user = await currentUser(); if (!user) return NextResponse.json({error:"unauthorized"},{status:401});
  const parsed = characterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error:"invalid_input", issues:parsed.error.issues},{status:400});
  const cls = await query('SELECT id FROM classes WHERE id=$1 AND active=true',[parsed.data.classId]);
  if (!cls.rowCount) return NextResponse.json({error:"invalid_class"},{status:400});
  await query('INSERT INTO characters(user_id,class_id,character_name) VALUES($1,$2,$3)',[user.id,parsed.data.classId,parsed.data.characterName]);
  return NextResponse.json({ok:true});
}
