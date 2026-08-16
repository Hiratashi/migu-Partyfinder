import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { classAdminSchema } from "@/lib/class-admin-validation";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

export async function PATCH(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req))return NextResponse.json({error:"bad_origin"},{status:403});
  const admin=await currentAdmin();
  if(!admin)return NextResponse.json({error:"forbidden"},{status:403});

  const {id}=await params;
  const parsed=classAdminSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json(
    {error:"invalid_input",issues:parsed.error.issues},{status:400}
  );

  const d=parsed.data;
  try {
    const r=await query(`
      UPDATE classes SET
        slug=$1,name=$2,abbreviation=$3,base_character=$4,path_number=$5,
        damage_type=$6,role=$7,icon_path=$8,active=$9,sort_order=$10
      WHERE id=$11
      RETURNING id
    `,[d.slug,d.name,d.abbreviation,d.baseCharacter,d.pathNumber,
       d.damageType,d.role,d.iconPath||null,d.active,d.sortOrder,id]);

    if(!r.rowCount)return NextResponse.json({error:"not_found"},{status:404});

    await query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'ADMIN_CLASS_UPDATE','class',$2)",
      [admin.id,id]
    );
    return NextResponse.json({ok:true,id});
  } catch(e:any) {
    if(e?.code==="23505")return NextResponse.json(
      {error:"duplicate_slug",message:"That URL name already exists."},{status:409}
    );
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

  const admin=await currentAdmin();
  if(!admin) {
    return NextResponse.json({error:"forbidden"},{status:403});
  }

  const {id}=await params;

  const usage=await query<{name:string;character_refs:number}>(`
    SELECT
      c.name,
      (
        SELECT COUNT(*)::int
        FROM characters ch
        WHERE ch.class_id=c.id
      ) character_refs
    FROM classes c
    WHERE c.id=$1
  `,[id]);

  if(!usage.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  if(usage.rows[0].character_refs>0) {
    return NextResponse.json(
      {
        error:"class_in_use",
        message:
          `This class cannot be deleted because `+
          `${usage.rows[0].character_refs} character${
            usage.rows[0].character_refs===1?" uses":"s use"
          } it. Deactivate it instead.`,
      },
      {status:409},
    );
  }

  const deleted=await query(
    "DELETE FROM classes WHERE id=$1 RETURNING id",
    [id],
  );

  if(!deleted.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  await query(
    "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'ADMIN_CLASS_DELETE','class',$2,jsonb_build_object('name',$3::text))",
    [admin.id,id,usage.rows[0].name],
  );

  return NextResponse.json({ok:true});
}
