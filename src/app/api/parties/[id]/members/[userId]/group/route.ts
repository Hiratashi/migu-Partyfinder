import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";
import { notifyUsers } from "@/lib/notifications";

const schema=z.object({groupNumber:z.union([z.literal(1),z.literal(2),z.null()])});

export async function PATCH(req:NextRequest,{
  params,
}:{params:Promise<{id:string;userId:string}>}) {
  if(!sameOrigin(req))return NextResponse.json({error:"bad_origin"},{status:403});
  const limited=limitWrite(req);
  if(limited)return limited;
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const {id,userId}=await params;
  if(!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(userId).success) {
    return NextResponse.json({error:"invalid_id"},{status:400});
  }
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"invalid_input"},{status:400});

  const client=await db.connect();
  try {
    await client.query("BEGIN");
    const party=await client.query<{leader_id:string;group_count:number;status:string}>(`
      SELECT leader_id,group_count,status FROM parties WHERE id=$1 FOR UPDATE
    `,[id]);
    if(!party.rowCount || party.rows[0].leader_id!==user.id || party.rows[0].group_count!==2 ||
       !["OPEN","FULL"].includes(party.rows[0].status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"forbidden_or_unavailable"},{status:403});
    }
    const member=await client.query<{group_number:number|null}>(`
      SELECT group_number FROM party_members
      WHERE party_id=$1 AND user_id=$2 AND status='ACCEPTED'
    `,[id,userId]);
    if(!member.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_member"},{status:404});
    }
    const next=parsed.data.groupNumber;
    if(member.rows[0].group_number===next) {
      await client.query("COMMIT");
      return NextResponse.json({ok:true});
    }
    if(next!==null) {
      const count=await client.query<{total:number}>(`
        SELECT count(*)::int AS total FROM party_members
        WHERE party_id=$1 AND status='ACCEPTED' AND group_number=$2 AND user_id<>$3
      `,[id,next,userId]);
      if(count.rows[0].total>=4) {
        await client.query("ROLLBACK");
        return NextResponse.json({error:"striker_party_full"},{status:409});
      }
    }
    await client.query(`UPDATE party_members SET group_number=$3
      WHERE party_id=$1 AND user_id=$2`,[id,userId,next]);
    await client.query(`INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata)
      VALUES($1,'PARTY_GROUP_ASSIGN','party',$2,jsonb_build_object('member_id',$3::text,'before',$4::int,'after',$5::int))`,
    [user.id,id,userId,member.rows[0].group_number,next]);
    if(userId!==user.id)await notifyUsers(client,{
      partyId:id,recipients:[userId],kind:"PARTY_GROUP_CHANGED",
      title:"Striker Party assignment changed",
      body:next===null?"Your leader moved you to the unassigned pool.":
        `Your leader assigned you to Striker Party ${next}.`,
    });
    await client.query("COMMIT");
    return NextResponse.json({ok:true});
  } catch(error) {
    await client.query("ROLLBACK");
    console.error(error);
    return NextResponse.json({error:"server_error"},{status:500});
  } finally {client.release();}
}
