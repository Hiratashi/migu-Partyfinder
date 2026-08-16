import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(req))return NextResponse.json({error:'bad_origin',message:'Request origin was rejected.'},{status:403});
  const u=await currentUser();if(!u)return NextResponse.json({error:'unauthorized',message:'Please sign in again.'},{status:401});
  const {id}=await params;
  const r=await query("UPDATE parties SET status='CANCELLED',cancelled_at=now(),updated_at=now() WHERE id=$1 AND leader_id=$2 AND status IN ('OPEN','FULL') RETURNING id",[id,u.id]);
  if(!r.rowCount)return NextResponse.json({error:'not_editable',message:'Only the leader can cancel an open party.'},{status:409});
  await query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'PARTY_CANCEL','party',$2)",[u.id,id]);
  return NextResponse.json({ok:true});
}
