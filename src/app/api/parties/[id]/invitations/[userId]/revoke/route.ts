import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

export async function POST(
  req:NextRequest,
  {params}:{params:Promise<{id:string;userId:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json(
      {error:"bad_origin",message:"Request origin was rejected."},
      {status:403},
    );
  }

  const leader=await currentUser();
  if(!leader) {
    return NextResponse.json(
      {error:"unauthorized",message:"Please sign in again."},
      {status:401},
    );
  }

  const {id,userId}=await params;

  const party=await query(
    `SELECT 1
     FROM parties
     WHERE id=$1
       AND leader_id=$2
       AND status IN ('OPEN','FULL')`,
    [id,leader.id],
  );

  if(!party.rowCount) {
    return NextResponse.json(
      {
        error:"forbidden",
        message:"Only the leader of an active party can revoke invitations.",
      },
      {status:403},
    );
  }

  const r=await query(
    `DELETE FROM party_members
     WHERE party_id=$1
       AND user_id=$2
       AND status='INVITED'
     RETURNING user_id`,
    [id,userId],
  );

  if(!r.rowCount) {
    return NextResponse.json(
      {
        error:"invitation_not_found",
        message:"That invitation is no longer pending.",
      },
      {status:404},
    );
  }

  await query(
    "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'PARTY_INVITE_REVOKE','party',$2,jsonb_build_object('user_id',$3::text))",
    [leader.id,id,userId],
  );

  return NextResponse.json({ok:true});
}
