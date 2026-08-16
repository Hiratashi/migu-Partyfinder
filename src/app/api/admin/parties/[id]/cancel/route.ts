import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { writeAudit } from "@/lib/audit";

const schema=z.object({
  reason:z.string().trim().max(300).optional(),
});

export async function POST(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const admin=await currentAdmin();

  if(!admin) {
    return NextResponse.json({error:"forbidden"},{status:403});
  }

  const {id}=await params;
  const parsed=schema.safeParse(
    await req.json().catch(()=>({})),
  );

  if(!parsed.success) {
    return NextResponse.json({error:"invalid_input"},{status:400});
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    const party=await client.query<{
      id:string;
      status:string;
      leader_id:string;
    }>(`
      SELECT id,status,leader_id
      FROM parties
      WHERE id=$1
      FOR UPDATE
    `,[id]);

    if(!party.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_found"},{status:404});
    }

    if(!["OPEN","FULL"].includes(party.rows[0].status)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error:"not_active",
          message:"This party is no longer active.",
        },
        {status:409},
      );
    }

    await client.query(`
      UPDATE parties
      SET
        status='CANCELLED',
        cancelled_at=COALESCE(cancelled_at,now()),
        updated_at=now()
      WHERE id=$1
    `,[id]);

    await writeAudit({
      userId:admin.id,
      action:"ADMIN_PARTY_CANCEL",
      entityType:"party",
      entityId:id,
      metadata:{
        leader_user_id:party.rows[0].leader_id,
        previous_status:party.rows[0].status,
        reason:parsed.data.reason??"Administrative moderation",
      },
    },client);

    await client.query("COMMIT");

    return NextResponse.json({ok:true});
  } catch(e) {
    await client.query("ROLLBACK");
    console.error(e);

    return NextResponse.json(
      {error:"server_error"},
      {status:500},
    );
  } finally {
    client.release();
  }
}
