import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

const schema=z.object({
  armorType:z.enum(["TENEBROUS","EXASCALE"]).nullable(),
  exascaleColor:z.enum(["RED","BLUE","GREEN"]).nullable(),
}).superRefine((value,ctx)=>{
  if(value.armorType==="EXASCALE"&&!value.exascaleColor) {
    ctx.addIssue({
      code:"custom",
      path:["exascaleColor"],
      message:"Choose an Exascale color.",
    });
  }

  if(value.armorType!=="EXASCALE"&&value.exascaleColor!==null) {
    ctx.addIssue({
      code:"custom",
      path:["exascaleColor"],
      message:"Exascale color is only valid with Exascale armor.",
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

  const updated=await query(`
    UPDATE characters
    SET
      armor_type=$1,
      exascale_color=$2
    WHERE id=$3
      AND user_id=$4
      AND archived_at IS NULL
    RETURNING id
  `,[
    parsed.data.armorType,
    parsed.data.exascaleColor,
    id,
    user.id,
  ]);

  if(!updated.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  await query(
    `INSERT INTO audit_log(
      user_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    VALUES(
      $1,
      'CHARACTER_ARMOR_SAVE',
      'character',
      $2,
      jsonb_build_object(
        'armor_type',$3::text,
        'exascale_color',$4::text
      )
    )`,
    [
      user.id,
      id,
      parsed.data.armorType,
      parsed.data.exascaleColor,
    ],
  );

  return NextResponse.json({
    ok:true,
    armorType:parsed.data.armorType,
    exascaleColor:parsed.data.exascaleColor,
  });
}
