import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";
import { notifyUsers,resolvePartyNotifications } from "@/lib/notifications";

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(req))return NextResponse.json({error:'bad_origin',message:'Request origin was rejected.'},{status:403});
  
  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;
const u=await currentUser();if(!u)return NextResponse.json({error:'unauthorized',message:'Please sign in again.'},{status:401});
  const {id}=await params;
  const client=await db.connect();
  try {
    await client.query("BEGIN");
    const r=await client.query("UPDATE parties SET status='CANCELLED',cancelled_at=now(),updated_at=now() WHERE id=$1 AND leader_id=$2 AND status IN ('OPEN','FULL') RETURNING id",[id,u.id]);
    if(!r.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:'not_editable',message:'Only the leader can cancel an open party.'},{status:409});
    }
    await client.query("DELETE FROM party_reconfirmations WHERE party_id=$1",[id]);
    const recipients=await client.query<{user_id:string}>(`
      SELECT user_id FROM party_members
      WHERE party_id=$1 AND user_id<>$2 AND status IN ('ACCEPTED','INVITED')
    `,[id,u.id]);
    await resolvePartyNotifications(client,id);
    await notifyUsers(client,{
      partyId:id,
      recipients:recipients.rows.map(row=>row.user_id),
      kind:"PARTY_CLOSED",
      title:"Party cancelled",
      body:"The leader cancelled this party. Any pending response is closed.",
    });
    await client.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'PARTY_CANCEL','party',$2)",[u.id,id]);
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
