import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { syncPartyOpenFull } from "@/lib/partyState";
import { limitWrite } from "@/lib/rate-limit";
import { resolvePartyNotifications } from "@/lib/notifications";

export async function POST(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req))return NextResponse.json({error:"bad_origin"},{status:403});
  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const {id}=await params;

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
    if(!["OPEN","FULL"].includes(party.rows[0].status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"party_closed",message:"This party is no longer open."},{status:409});
    }
    if(party.rows[0].leader_id===user.id) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"leader_cannot_leave",message:"The party leader must cancel the party instead of leaving it."},{status:400});
    }

    const removed=await client.query(`
      DELETE FROM party_members
      WHERE party_id=$1 AND user_id=$2 AND status='ACCEPTED'
      RETURNING user_id
    `,[id,user.id]);
    if(!removed.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_member",message:"You are not currently joined to this party."},{status:404});
    }
    await syncPartyOpenFull(id,client);
    await resolvePartyNotifications(client,id,[user.id]);
    await client.query(`
      INSERT INTO audit_log(user_id,action,entity_type,entity_id)
      VALUES($1,'PARTY_LEAVE','party',$2)
    `,[user.id,id]);
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
