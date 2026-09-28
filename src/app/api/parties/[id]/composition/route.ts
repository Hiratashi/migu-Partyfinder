import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";
import { notifyUsers } from "@/lib/notifications";
import { requestReconfirmation } from "@/lib/reconfirmation";

const schema=z.object({restricted:z.boolean()});

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  if(!sameOrigin(req))return NextResponse.json({error:"bad_origin"},{status:403});
  const limited=limitWrite(req);
  if(limited)return limited;
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const {id}=await params;
  const input=schema.safeParse(await req.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"invalid_input"},{status:400});

  const client=await db.connect();
  try {
    await client.query("BEGIN");
    const party=await client.query<{composition_restricted:boolean}>(`
      SELECT composition_restricted FROM parties
      WHERE id=$1 AND leader_id=$2 AND status IN ('OPEN','FULL')
      FOR UPDATE
    `,[id,user.id]);
    if(!party.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"forbidden"},{status:403});
    }
    if(party.rows[0].composition_restricted===input.data.restricted) {
      await client.query("COMMIT");
      return NextResponse.json({ok:true});
    }
    await client.query("UPDATE parties SET composition_restricted=$1,updated_at=now() WHERE id=$2",[input.data.restricted,id]);
    await client.query(`
      INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata)
      VALUES($1,'PARTY_COMPOSITION_MODE','party',$2,jsonb_build_object('restricted',$3::boolean))
    `,[user.id,id,input.data.restricted]);
    const details=[{
      label:"Role matching",
      before:party.rows[0].composition_restricted?"Enforced":"Open",
      after:input.data.restricted?"Enforced":"Open",
    }];
    const recipients=await requestReconfirmation(client,id,user.id,details);
    await notifyUsers(client,{
      partyId:id,
      recipients,
      kind:"PARTY_CHANGED",
      title:"Party details changed",
      body:"The party role matching setting changed. Review the updated details.",
      changeDetails:details,
    });
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
