import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

const schema=z.object({
  disabled:z.boolean(),
});

export async function PATCH(
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

  if(id===admin.id) {
    return NextResponse.json(
      {
        error:"self_access_change",
        message:"You cannot disable your own account.",
      },
      {status:409},
    );
  }

  const parsed=schema.safeParse(
    await req.json().catch(()=>null),
  );

  if(!parsed.success) {
    return NextResponse.json({error:"invalid_input"},{status:400});
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    const target=await client.query<{
      username:string;
      is_admin:boolean;
    }>(`
      SELECT username,is_admin
      FROM users
      WHERE id=$1
      FOR UPDATE
    `,[id]);

    if(!target.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_found"},{status:404});
    }

    if(parsed.data.disabled&&target.rows[0].is_admin) {
      const admins=await client.query<{count:number}>(`
        SELECT COUNT(*)::int count
        FROM users
        WHERE is_admin=true
          AND access_disabled=false
      `);

      if(admins.rows[0].count<=1) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error:"last_admin",
            message:"The last active administrator cannot be disabled.",
          },
          {status:409},
        );
      }
    }

    await client.query(`
      UPDATE users
      SET
        access_disabled=$1,
        access_disabled_reason=$2,
        updated_at=now()
      WHERE id=$3
    `,[
      parsed.data.disabled,
      parsed.data.disabled?"ADMIN":null,
      id,
    ]);

    if(parsed.data.disabled) {
      await client.query(
        "DELETE FROM sessions WHERE user_id=$1",
        [id],
      );
    }

    await client.query(
      `INSERT INTO audit_log(
        user_id,action,entity_type,entity_id,metadata
      )
      VALUES(
        $1,$2,'user',$3,
        jsonb_build_object('target_username',$4::text)
      )`,
      [
        admin.id,
        parsed.data.disabled
          ? "ADMIN_USER_DISABLE"
          : "ADMIN_USER_ENABLE",
        id,
        target.rows[0].username,
      ],
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
