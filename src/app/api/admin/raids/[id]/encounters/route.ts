import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { encounterAdminSchema } from "@/lib/admin-validation";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

export async function POST(
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
  const parsed=encounterAdminSchema.safeParse(
    await req.json().catch(()=>null),
  );

  if(!parsed.success) {
    return NextResponse.json(
      {error:"invalid_input",issues:parsed.error.issues},
      {status:400},
    );
  }

  const raid=await query("SELECT 1 FROM raids WHERE id=$1",[id]);
  if(!raid.rowCount) {
    return NextResponse.json({error:"raid_not_found"},{status:404});
  }

  const d=parsed.data;

  try {
    const result=await query<{id:string}>(`
      INSERT INTO encounters(raid_id,code,name,sort_order)
      VALUES($1,$2,$3,$4)
      RETURNING id
    `,[id,d.code,d.name,d.sortOrder]);

    await query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'ADMIN_ENCOUNTER_CREATE','encounter',$2,jsonb_build_object('raid_id',$3::text,'code',$4::text))",
      [admin.id,result.rows[0].id,id,d.code],
    );

    return NextResponse.json({ok:true,id:result.rows[0].id});
  } catch(e:any) {
    if(e?.code==="23505") {
      return NextResponse.json(
        {error:"duplicate_code",message:"That encounter code already exists for this raid."},
        {status:409},
      );
    }
    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  }
}
