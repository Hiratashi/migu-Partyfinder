import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";
import { syncPartyOpenFull } from "@/lib/partyState";
import { resolvePartyNotifications } from "@/lib/notifications";

const schema=z.object({action:z.enum(["ACCEPT","DECLINE"]),revision:z.uuid()});

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  if(!sameOrigin(req))return NextResponse.json({error:"bad_origin"},{status:403});
  const limited=limitWrite(req);
  if(limited)return limited;
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const {id}=await params;
  if(!z.uuid().safeParse(id).success)return NextResponse.json({error:"invalid_id"},{status:400});
  const input=schema.safeParse(await req.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"invalid_input"},{status:400});

  const client=await db.connect();
  try {
    await client.query("BEGIN");
    const party=await client.query<{status:string}>(`
      SELECT status FROM parties WHERE id=$1 FOR UPDATE
    `,[id]);
    if(!party.rowCount||!["OPEN","FULL"].includes(party.rows[0].status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"party_closed"},{status:409});
    }
    const pending=await client.query<{revision:string}>(`
      SELECT pr.revision FROM party_reconfirmations pr
      JOIN party_members pm ON pm.party_id=pr.party_id AND pm.user_id=pr.user_id
      WHERE pr.party_id=$1 AND pr.user_id=$2 AND pm.status='ACCEPTED'
      FOR UPDATE OF pr
    `,[id,user.id]);
    if(!pending.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"no_pending_change"},{status:409});
    }
    if(pending.rows[0].revision!==input.data.revision) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"party_changed_again",message:"The party changed again. Review the latest details before responding."},{status:409});
    }

    if(input.data.action==="DECLINE") {
      await client.query("DELETE FROM party_members WHERE party_id=$1 AND user_id=$2",[id,user.id]);
      await syncPartyOpenFull(id,client);
    } else {
      await client.query("DELETE FROM party_reconfirmations WHERE party_id=$1 AND user_id=$2",[id,user.id]);
    }
    await resolvePartyNotifications(client,id,[user.id]);
    await client.query(`
      INSERT INTO audit_log(user_id,action,entity_type,entity_id)
      VALUES($1,$2,'party',$3)
    `,[user.id,input.data.action==="ACCEPT"?"PARTY_RECONFIRM_ACCEPT":"PARTY_RECONFIRM_DECLINE",id]);
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
