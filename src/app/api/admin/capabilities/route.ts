import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { capabilityAdminSchema } from "@/lib/capability-admin-validation";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

export async function POST(req:NextRequest) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  const admin=await currentAdmin();
  if(!admin) {
    return NextResponse.json({error:"forbidden"},{status:403});
  }

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
    const result=await query<{id:string}>(`
      INSERT INTO capability_tags(
        slug,name,description,category,raid_id,active,sort_order
      )
      VALUES($1,$2,$3,$4,$5,$6,$7)
      RETURNING id
    `,[
      d.slug,d.name,d.description,d.category,d.raidId,d.active,d.sortOrder,
    ]);

    const id=result.rows[0].id;

    await query(
      `INSERT INTO audit_log(
        user_id,action,entity_type,entity_id,metadata
      )
      VALUES(
        $1,'ADMIN_CAPABILITY_CREATE','capability',$2,
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
