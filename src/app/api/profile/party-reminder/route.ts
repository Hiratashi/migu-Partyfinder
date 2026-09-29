import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

const schema=z.object({minutes:z.number().int().min(1).max(10080).nullable()});

export async function PATCH(req:NextRequest) {
  if(!sameOrigin(req))return NextResponse.json({error:"bad_origin"},{status:403});
  const limited=limitWrite(req);
  if(limited)return limited;
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const input=schema.safeParse(await req.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"invalid_input"},{status:400});
  await query("UPDATE users SET party_reminder_minutes=$2 WHERE id=$1",
    [user.id,input.data.minutes]);
  return NextResponse.json({ok:true});
}
