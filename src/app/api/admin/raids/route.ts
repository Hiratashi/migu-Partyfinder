import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { raidAdminSchema } from "@/lib/admin-validation";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

export async function POST(req:NextRequest) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const admin=await currentAdmin();
  if(!admin) {
    return NextResponse.json({error:"forbidden"},{status:403});
  }

  const parsed=raidAdminSchema.safeParse(
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
      INSERT INTO raids(
        slug,name,party_size,supported_stages,default_stage,
        practice_supported,active,sort_order
      )
      VALUES($1,$2,$3,$4::smallint[],$5,$6,$7,$8)
      RETURNING id
    `,[
      d.slug,d.name,d.partySize,d.supportedStages,d.defaultStage,
      d.practiceSupported,d.active,d.sortOrder,
    ]);

    const id=result.rows[0].id;

    await query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'ADMIN_RAID_CREATE','raid',$2,jsonb_build_object('slug',$3::text))",
      [admin.id,id,d.slug],
    );

    return NextResponse.json({ok:true,id});
  } catch(e:any) {
    if(e?.code==="23505") {
      return NextResponse.json(
        {error:"duplicate_slug",message:"A raid with that slug already exists."},
        {status:409},
      );
    }
    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  }
}
