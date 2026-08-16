import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { characterSchema } from "@/data/validation";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

export async function POST(req:NextRequest) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const user=await currentUser();
  if(!user) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

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
      {
        error:"invalid_class",
        message:"That class is not currently selectable.",
      },
      {status:400},
    );
  }

  try {
    const result=await query<{id:string}>(`
      INSERT INTO characters(user_id,class_id,character_name)
      VALUES($1,$2,$3)
      RETURNING id
    `,[user.id,parsed.data.classId,parsed.data.characterName]);

    await query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'CHARACTER_CREATE','character',$2)",
      [user.id,result.rows[0].id],
    );

    return NextResponse.json({ok:true,id:result.rows[0].id});
  } catch(e:any) {
    if(e?.code==="23505") {
      return NextResponse.json(
        {
          error:"duplicate_character_name",
          message:"You already have an active character with that name.",
        },
        {status:409},
      );
    }

    console.error(e);
    return NextResponse.json({error:"server_error"},{status:500});
  }
}
