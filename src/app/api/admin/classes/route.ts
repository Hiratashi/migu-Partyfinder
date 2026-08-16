import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { classAdminSchema } from "@/lib/class-admin-validation";
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

  const parsed=classAdminSchema.safeParse(
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
      INSERT INTO classes(
        slug,name,abbreviation,damage_type,role,
        icon_path,active,sort_order
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `,[
      d.slug,
      d.name,
      d.abbreviation,
      d.damageType,
      d.role,
      d.iconPath||null,
      d.active,
      d.sortOrder,
    ]);

    const id=result.rows[0].id;

    await query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'ADMIN_CLASS_CREATE','class',$2,jsonb_build_object('slug',$3::text))",
      [admin.id,id,d.slug],
    );

    return NextResponse.json({ok:true,id});
  } catch(e:any) {
    if(e?.code==="23505") {
      return NextResponse.json(
        {
          error:"duplicate_slug",
          message:"A class with that slug already exists.",
        },
        {status:409},
      );
    }

    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  }
}
