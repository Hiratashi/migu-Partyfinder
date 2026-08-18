import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { syncPartyOpenFull } from "@/lib/partyState";
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

  const u=await currentUser();
  if(!u) {
    return NextResponse.json(
      {error:"unauthorized",message:"Please sign in again."},
      {status:401},
    );
  }

  const {id}=await params;

  const p=await query<{leader_id:string;status:string}>(
    "SELECT leader_id,status FROM parties WHERE id=$1",
    [id],
  );

  if(!p.rowCount) {
    return NextResponse.json(
      {error:"not_found",message:"Party not found."},
      {status:404},
    );
  }

  if(!["OPEN","FULL"].includes(p.rows[0].status)) {
    return NextResponse.json(
      {error:"party_closed",message:"This party is no longer open."},
      {status:409},
    );
  }

  if(p.rows[0].leader_id===u.id) {
    return NextResponse.json(
      {
        error:"leader_cannot_leave",
        message:"The party leader must cancel the party instead of leaving it.",
      },
      {status:400},
    );
  }

  const r=await query(
    `DELETE FROM party_members
     WHERE party_id=$1 AND user_id=$2 AND status='ACCEPTED'
     RETURNING user_id`,
    [id,u.id],
  );

  if(!r.rowCount) {
    return NextResponse.json(
      {
        error:"not_member",
        message:"You are not currently joined to this party.",
      },
      {status:404},
    );
  }

  await syncPartyOpenFull(id);

  await query(
    "INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'PARTY_LEAVE','party',$2)",
    [u.id,id],
  );

  return NextResponse.json({ok:true});
}
