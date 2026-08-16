import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { encounterAdminSchema } from "@/lib/admin-validation";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

export async function PATCH(
  req:NextRequest,
  {params}:{params:Promise<{id:string;encounterId:string}>},
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

  const {id,encounterId}=await params;
  const parsed=encounterAdminSchema.safeParse(
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
      UPDATE encounters
      SET code=$1,name=$2,sort_order=$3
      WHERE id=$4 AND raid_id=$5
      RETURNING id
    `,[d.code,d.name,d.sortOrder,encounterId,id]);

    if(!result.rowCount) {
      return NextResponse.json({error:"not_found"},{status:404});
    }

    await query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'ADMIN_ENCOUNTER_UPDATE','encounter',$2,jsonb_build_object('raid_id',$3::text,'code',$4::text))",
      [admin.id,encounterId,id,d.code],
    );

    return NextResponse.json({ok:true,id:encounterId});
  } catch(e:any) {
    if(e?.code==="23505") {
      return NextResponse.json(
        {
          error:"duplicate_code",
          message:"That encounter code already exists for this raid.",
        },
        {status:409},
      );
    }

    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  }
}

export async function DELETE(
  req:NextRequest,
  {params}:{params:Promise<{id:string;encounterId:string}>},
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

  const {id,encounterId}=await params;

  const refs=await query<{
    party_refs:number;
    availability_refs:number;
    practice_refs:number;
  }>(`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM party_encounters
        WHERE encounter_id=$1
      ) party_refs,
      (
        SELECT COUNT(*)::int
        FROM availability_profile_encounters
        WHERE encounter_id=$1
      ) availability_refs,
      (
        SELECT COUNT(*)::int
        FROM party_practice_encounters
        WHERE encounter_id=$1
      ) practice_refs
  `,[encounterId]);

  const r=refs.rows[0];

  if(r.party_refs+r.availability_refs+r.practice_refs>0) {
    return NextResponse.json(
      {
        error:"encounter_in_use",
        message:
          `This encounter cannot be removed because it is referenced by `+
          `${r.party_refs} party run(s), ${r.practice_refs} practice selection(s), `+
          `and ${r.availability_refs} availability profile(s).`,
      },
      {status:409},
    );
  }

  const deleted=await query(
    "DELETE FROM encounters WHERE id=$1 AND raid_id=$2 RETURNING id",
    [encounterId,id],
  );

  if(!deleted.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  await query(
    "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'ADMIN_ENCOUNTER_DELETE','encounter',$2,jsonb_build_object('raid_id',$3::text))",
    [admin.id,encounterId,id],
  );

  return NextResponse.json({ok:true});
}
