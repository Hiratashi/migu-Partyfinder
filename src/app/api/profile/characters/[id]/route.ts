import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { characterSchema } from "@/data/validation";
import { db, query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

export async function PATCH(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const user=await currentUser();
  if(!user) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  const {id}=await params;
  const parsed=characterSchema.safeParse(
    await req.json().catch(()=>null),
  );

  if(!parsed.success) {
    return NextResponse.json(
      {error:"invalid_input",issues:parsed.error.issues},
      {status:400},
    );
  }

  const cls=await query(
    "SELECT id FROM classes WHERE id=$1 AND active=true",
    [parsed.data.classId],
  );

  if(!cls.rowCount) {
    return NextResponse.json(
      {error:"invalid_class",message:"That class is not currently selectable."},
      {status:400},
    );
  }

  const updated=await query(`
    UPDATE characters
    SET
      class_id=$1,
      character_name=$2
    WHERE id=$3 AND user_id=$4
    RETURNING id
  `,[
    parsed.data.classId,
    parsed.data.characterName,
    id,
    user.id,
  ]);

  if(!updated.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  await query(
    "INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'CHARACTER_UPDATE','character',$2)",
    [user.id,id],
  );

  return NextResponse.json({ok:true,id});
}

export async function DELETE(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const user=await currentUser();
  if(!user) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  const {id}=await params;

  const owned=await query<{character_name:string}>(`
    SELECT character_name
    FROM characters
    WHERE id=$1 AND user_id=$2
  `,[id,user.id]);

  if(!owned.rowCount) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  const partyRefs=await query<{count:number}>(`
    SELECT COUNT(*)::int count
    FROM party_members
    WHERE character_id=$1
  `,[id]);

  if(partyRefs.rows[0].count>0) {
    return NextResponse.json(
      {
        error:"character_in_use",
        message:
          `This character cannot be removed because `+
          `${partyRefs.rows[0].count} party record${
            partyRefs.rows[0].count===1?" references":"s reference"
          } it. Change the character on those active parties first; historical party references are kept for integrity.`,
      },
      {status:409},
    );
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM availability_profile_characters WHERE character_id=$1",
      [id],
    );

    const deleted=await client.query(
      "DELETE FROM characters WHERE id=$1 AND user_id=$2 RETURNING id",
      [id,user.id],
    );

    if(!deleted.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_found"},{status:404});
    }

    await client.query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'CHARACTER_DELETE','character',$2,jsonb_build_object('character_name',$3::text))",
      [user.id,id,owned.rows[0].character_name],
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
