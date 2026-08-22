import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { raidAdminSchema } from "@/lib/admin-validation";
import { db, query } from "@/lib/db";
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
    const result=await query(`
      UPDATE raids
      SET
        slug=$1,
        name=$2,
        party_size=$3,
        supported_stages=$4::smallint[],
        default_stage=$5,
        practice_supported=$6,
        active=$7,
        sort_order=$8
      WHERE id=$9
      RETURNING id
    `,[
      d.slug,d.name,d.partySize,d.supportedStages,d.defaultStage,
      d.practiceSupported,d.active,d.sortOrder,id,
    ]);

    if(!result.rowCount) {
      return NextResponse.json({error:"not_found"},{status:404});
    }

    await query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'ADMIN_RAID_UPDATE','raid',$2,jsonb_build_object('slug',$3::text))",
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
    party_refs:number;
    availability_refs:number;
    capability_refs:number;
  }>(`
    SELECT
      r.name,
      (SELECT COUNT(*)::int FROM parties p WHERE p.raid_id=r.id) party_refs,
      (
        SELECT COUNT(*)::int
        FROM availability_profiles ap
        WHERE ap.raid_id=r.id
      ) availability_refs,
      (
        SELECT COUNT(*)::int
        FROM capability_tags ct
        WHERE ct.raid_id=r.id
      ) capability_refs
    FROM raids r
    WHERE r.id=$1
  `,[id]);

  if(!usage.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  const current=usage.rows[0];

  if(
    current.party_refs>0||
    current.availability_refs>0||
    current.capability_refs>0
  ) {
    return NextResponse.json(
      {
        error:"raid_in_use",
        message:
          `This raid cannot be deleted because it has `+
          `${current.party_refs} party reference(s) and `+
          `${current.availability_refs} availability profile reference(s), and `+
          `${current.capability_refs} capability reference(s). `+
          `Remove or re-scope those references, or deactivate the raid instead.`,
      },
      {status:409},
    );
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM encounters WHERE raid_id=$1",
      [id],
    );

    const deleted=await client.query(
      "DELETE FROM raids WHERE id=$1 RETURNING id",
      [id],
    );

    if(!deleted.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_found"},{status:404});
    }

    await client.query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'ADMIN_RAID_DELETE','raid',$2,jsonb_build_object('name',$3::text))",
      [admin.id,id,current.name],
    );

    await client.query("COMMIT");
    return NextResponse.json({ok:true});
  } catch(e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  } finally {
    client.release();
  }
}
