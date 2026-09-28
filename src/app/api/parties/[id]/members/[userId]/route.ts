import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { syncPartyOpenFull } from "@/lib/partyState";
import { limitWrite } from "@/lib/rate-limit";
import { notifyUsers, resolvePartyNotifications } from "@/lib/notifications";

export async function DELETE(
  req:NextRequest,
  {params}:{params:Promise<{id:string;userId:string}>},
) {
  if(!sameOrigin(req))return NextResponse.json({error:"bad_origin"},{status:403});
  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const {id,userId}=await params;

  const client=await db.connect();
  try {
    await client.query("BEGIN");
    const party=await client.query<{leader_id:string;status:string}>(
      "SELECT leader_id,status FROM parties WHERE id=$1 FOR UPDATE",
      [id],
    );
    if(!party.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_found",message:"Party not found."},{status:404});
    }
    if(party.rows[0].leader_id!==user.id) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"forbidden",message:"Only the party leader can remove members."},{status:403});
    }
    if(!["OPEN","FULL"].includes(party.rows[0].status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"party_closed",message:"This party is no longer open."},{status:409});
    }
    if(userId===user.id) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"cannot_kick_leader",message:"The party leader cannot remove themselves."},{status:400});
    }

    const removed=await client.query(`
      DELETE FROM party_members
      WHERE party_id=$1 AND user_id=$2 AND status IN ('ACCEPTED','INVITED')
      RETURNING user_id
    `,[id,userId]);
    if(!removed.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_member",message:"That player is no longer in or invited to this party."},{status:404});
    }
    await syncPartyOpenFull(id,client);
    await resolvePartyNotifications(client,id,[userId]);
    await notifyUsers(client,{
      partyId:id,
      recipients:[userId],
      kind:"PARTY_REMOVED",
      title:"Removed from party",
      body:"The leader removed you from this party. Your place is no longer reserved.",
    });
    await client.query(`
      INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata)
      VALUES($1,'PARTY_KICK','party',$2,jsonb_build_object('removed_user_id',$3::text))
    `,[user.id,id,userId]);
    await client.query("COMMIT");
    return NextResponse.json({ok:true});
  } catch(error) {
    await client.query("ROLLBACK");
    console.error(error);
    return NextResponse.json({error:"server_error"},{status:500});
  } finally {
    client.release();
  }
}
