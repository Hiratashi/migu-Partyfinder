import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";
const schema=z.object({restricted:z.boolean()});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;
const user=await currentUser();if(!user)return NextResponse.json({error:'unauthorized'},{status:401});const {id}=await params;const body=schema.safeParse(await req.json().catch(()=>null));if(!body.success)return NextResponse.json({error:'invalid_input'},{status:400});
  const r=await query("UPDATE parties SET composition_restricted=$1,updated_at=now() WHERE id=$2 AND leader_id=$3 AND status IN ('OPEN','FULL') RETURNING id",[body.data.restricted,id,user.id]);if(!r.rowCount)return NextResponse.json({error:'forbidden'},{status:403});
  await query("INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'PARTY_COMPOSITION_MODE','party',$2,jsonb_build_object('restricted',$3::boolean))",[user.id,id,body.data.restricted]);return NextResponse.json({ok:true});
}
