import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

const schema=z.object({enabled:z.boolean().optional(),guildFallback:z.boolean().optional()})
  .refine(value=>value.enabled!==undefined || value.guildFallback!==undefined);

export async function PATCH(req:NextRequest) {
  if(!sameOrigin(req))return NextResponse.json({error:"bad_origin"},{status:403});
  const limited=limitWrite(req);
  if(limited)return limited;
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const input=schema.safeParse(await req.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"invalid_input"},{status:400});
  await query(`UPDATE users SET
    discord_notifications_enabled=COALESCE($2,discord_notifications_enabled),
    discord_guild_alerts_enabled=COALESCE($3,discord_guild_alerts_enabled)
    WHERE id=$1`,[user.id,input.data.enabled??null,input.data.guildFallback??null]);
  return NextResponse.json({ok:true});
}
