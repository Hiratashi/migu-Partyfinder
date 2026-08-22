import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { capabilityAdminSchema } from "@/lib/capability-admin-validation";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

export async function PATCH(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  const admin=await currentAdmin();
  if(!admin) {
    return NextResponse.json({error:"forbidden"},{status:403});
  }

  const {id}=await params;
  const parsed=capabilityAdminSchema.safeParse(
    await req.json().catch(()=>null),
  );

  if(!parsed.success) {
    return NextResponse.json(
      {error:"invalid_input",issues:parsed.error.issues},
      {status:400},
    );
  }

  const d=parsed.data;

  try {
    const result=await query(`
      UPDATE capability_tags
      SET
        slug=$1,
        name=$2,
        description=$3,
        category=$4,
        raid_id=$5,
        active=$6,
        sort_order=$7,
        updated_at=now()
      WHERE id=$8
      RETURNING id
    `,[
      d.slug,d.name,d.description,d.category,d.raidId,d.active,d.sortOrder,id,
    ]);

    if(!result.rowCount) {
      return NextResponse.json({error:"not_found"},{status:404});
    }

    await query(
      `INSERT INTO audit_log(
        user_id,action,entity_type,entity_id,metadata
      )
      VALUES(
        $1,'ADMIN_CAPABILITY_UPDATE','capability',$2,
        jsonb_build_object('slug',$3::text)
      )`,
      [admin.id,id,d.slug],
    );

    return NextResponse.json({ok:true,id});
  } catch(e:any) {
    if(e?.code==="23505") {
      return NextResponse.json(
        {
          error:"duplicate_slug",
          message:"A capability with that slug already exists.",
        },
        {status:409},
      );
    }
    if(e?.code==="23503") {
      return NextResponse.json(
        {
          error:"invalid_raid",
          message:"The selected raid no longer exists.",
        },
        {status:400},
      );
    }

    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  }
}

export async function DELETE(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  const admin=await currentAdmin();
  if(!admin) {
    return NextResponse.json({error:"forbidden"},{status:403});
  }

  const {id}=await params;

  const usage=await query<{
    name:string;
    character_refs:number;
  }>(`
    SELECT
      ct.name,
      (
        SELECT COUNT(*)::int
        FROM character_capabilities cc
        WHERE cc.capability_tag_id=ct.id
      ) character_refs
    FROM capability_tags ct
    WHERE ct.id=$1
  `,[id]);

  if(!usage.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  if(usage.rows[0].character_refs>0) {
    return NextResponse.json(
      {
        error:"capability_in_use",
        message:
          `This capability cannot be deleted because `+
          `${usage.rows[0].character_refs} character assignment(s) use it. `+
          `Deactivate it instead.`,
      },
      {status:409},
    );
  }

  const deleted=await query(
    "DELETE FROM capability_tags WHERE id=$1 RETURNING id",
    [id],
  );

  if(!deleted.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  await query(
    `INSERT INTO audit_log(
      user_id,action,entity_type,entity_id,metadata
    )
    VALUES(
      $1,'ADMIN_CAPABILITY_DELETE','capability',$2,
      jsonb_build_object('name',$3::text)
    )`,
    [admin.id,id,usage.rows[0].name],
  );

  return NextResponse.json({ok:true});
}
