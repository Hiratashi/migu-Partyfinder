import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

const schema=z.object({
  isAdmin:z.boolean(),
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
        error:"self_admin_change",
        message:"You cannot change your own administrator status here.",
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
      access_disabled:boolean;
    }>(`
      SELECT username,is_admin,access_disabled
      FROM users
      WHERE id=$1
      FOR UPDATE
    `,[id]);

    if(!target.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_found"},{status:404});
    }

    if(parsed.data.isAdmin&&target.rows[0].access_disabled) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error:"disabled_user",
          message:"Enable the user's access before promoting them to admin.",
        },
        {status:409},
      );
    }

    if(!parsed.data.isAdmin&&target.rows[0].is_admin) {
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
            message:"The last active administrator cannot be demoted.",
          },
          {status:409},
        );
      }
    }

    await client.query(
      "UPDATE users SET is_admin=$1,updated_at=now() WHERE id=$2",
      [parsed.data.isAdmin,id],
    );

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
        parsed.data.isAdmin
          ? "ADMIN_USER_PROMOTE"
          : "ADMIN_USER_DEMOTE",
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
