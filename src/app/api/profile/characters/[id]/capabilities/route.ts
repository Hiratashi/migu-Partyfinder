import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db, query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

const schema=z.object({
  capabilityIds:z.array(z.string().uuid()).max(100),
}).superRefine((value,ctx)=>{
  if(new Set(value.capabilityIds).size!==value.capabilityIds.length) {
    ctx.addIssue({
      code:"custom",
      path:["capabilityIds"],
      message:"Duplicate capability selections are not allowed.",
    });
  }
});

export async function PUT(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  const user=await currentUser();
  if(!user) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  const {id}=await params;
  const parsed=schema.safeParse(
    await req.json().catch(()=>null),
  );

  if(!parsed.success) {
    return NextResponse.json(
      {error:"invalid_input",issues:parsed.error.issues},
      {status:400},
    );
  }

  const owned=await query(`
    SELECT id
    FROM characters
    WHERE id=$1
      AND user_id=$2
      AND archived_at IS NULL
  `,[id,user.id]);

  if(!owned.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  const selectedIds=parsed.data.capabilityIds;

  if(selectedIds.length) {
    const valid=await query<{id:string}>(`
      SELECT id
      FROM capability_tags
      WHERE active=true
        AND id=ANY($1::uuid[])
    `,[selectedIds]);

    if(valid.rowCount!==selectedIds.length) {
      return NextResponse.json(
        {
          error:"invalid_capability",
          message:
            "One or more selected capabilities are no longer available.",
        },
        {status:400},
      );
    }
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    // Replace assignments only for definitions that are currently active.
    // Hidden/inactive assignments are intentionally preserved.
    await client.query(`
      DELETE FROM character_capabilities cc
      USING capability_tags ct
      WHERE cc.capability_tag_id=ct.id
        AND cc.character_id=$1
        AND ct.active=true
    `,[id]);

    for(const capabilityId of selectedIds) {
      await client.query(`
        INSERT INTO character_capabilities(
          character_id,
          capability_tag_id
        )
        VALUES($1,$2)
        ON CONFLICT DO NOTHING
      `,[id,capabilityId]);
    }

    await client.query(
      `INSERT INTO audit_log(
        user_id,
        action,
        entity_type,
        entity_id,
        metadata
      )
      VALUES(
        $1,
        'CHARACTER_CAPABILITIES_SAVE',
        'character',
        $2,
        jsonb_build_object(
          'active_capability_count',
          $3::int
        )
      )`,
      [user.id,id,selectedIds.length],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      ok:true,
      capabilityIds:selectedIds,
    });
  } catch(e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  } finally {
    client.release();
  }
}
