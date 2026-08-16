import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

export async function POST(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json(
      {error:"bad_origin",message:"Request origin was rejected."},
      {status:403},
    );
  }
  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  const user=await currentUser();
  if(!user) {
    return NextResponse.json(
      {error:"unauthorized",message:"Please sign in again."},
      {status:401},
    );
  }

  const {id}=await params;

  const r=await query(`
    UPDATE party_members
    SET status='DECLINED'
    WHERE party_id=$1
      AND user_id=$2
      AND status='INVITED'
    RETURNING party_id
  `,[id,user.id]);

  if(!r.rowCount) {
    return NextResponse.json(
      {
        error:"invitation_not_found",
        message:"This invitation is no longer pending.",
      },
      {status:404},
    );
  }

  await query(
    "INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'PARTY_INVITE_DECLINE','party',$2)",
    [user.id,id],
  );

  return NextResponse.json({ok:true});
}
