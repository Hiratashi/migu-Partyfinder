import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { syncPartyOpenFull } from "@/lib/partyState";
import { limitWrite } from "@/lib/rate-limit";

export async function DELETE(
  req:NextRequest,
  {params}:{params:Promise<{id:string;userId:string}>},
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

  const {id,userId}=await params;

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

  if(p.rows[0].leader_id!==u.id) {
    return NextResponse.json(
      {
        error:"forbidden",
        message:"Only the party leader can remove members.",
      },
      {status:403},
    );
  }

  if(!["OPEN","FULL"].includes(p.rows[0].status)) {
    return NextResponse.json(
      {error:"party_closed",message:"This party is no longer open."},
      {status:409},
    );
  }

  if(userId===u.id) {
    return NextResponse.json(
      {
        error:"cannot_kick_leader",
        message:"The party leader cannot remove themselves.",
      },
      {status:400},
    );
  }

  const r=await query(
    `DELETE FROM party_members
     WHERE party_id=$1
       AND user_id=$2
       AND status IN ('ACCEPTED','INVITED')
     RETURNING user_id`,
    [id,userId],
  );

  if(!r.rowCount) {
    return NextResponse.json(
      {
        error:"not_member",
        message:"That player is no longer in or invited to this party.",
      },
      {status:404},
    );
  }

  await syncPartyOpenFull(id);

  await query(
    "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'PARTY_KICK','party',$2,jsonb_build_object('removed_user_id',$3::text))",
    [u.id,id,userId],
  );

  return NextResponse.json({ok:true});
}
