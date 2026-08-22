import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

const schema=z.object({
  userId:z.string().uuid(),
  preferredCharacterIds:z.array(z.string().uuid()).max(20).default([]),
});

export async function POST(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>},
) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  const leader=await currentUser();
  if(!leader) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  const {id}=await params;
  const body=schema.safeParse(await req.json().catch(()=>null));
  if(!body.success) {
    return NextResponse.json({error:"invalid_input"},{status:400});
  }

  const preferredCharacterIds=[...new Set(body.data.preferredCharacterIds)];
  const client=await db.connect();

  try {
    await client.query("BEGIN");

    const party=await client.query(
      `SELECT 1
       FROM parties
       WHERE id=$1
         AND leader_id=$2
         AND status='OPEN'
       FOR UPDATE`,
      [id,leader.id],
    );

    if(!party.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"forbidden"},{status:403});
    }

    const target=await client.query(
      "SELECT 1 FROM users WHERE id=$1",
      [body.data.userId],
    );

    if(!target.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"unknown_user"},{status:404});
    }

    if(preferredCharacterIds.length>0) {
      const characters=await client.query<{id:string}>(
        `SELECT id
         FROM characters
         WHERE user_id=$1
           AND archived_at IS NULL
           AND id=ANY($2::uuid[])`,
        [body.data.userId,preferredCharacterIds],
      );

      if(characters.rowCount!==preferredCharacterIds.length) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error:"invalid_preferred_character",
            message:"One or more preferred characters are no longer available for that player.",
          },
          {status:400},
        );
      }
    }

    const invitation=await client.query(
      `INSERT INTO party_members(
         party_id,
         user_id,
         status,
         character_id
       )
       VALUES($1,$2,'INVITED',NULL)
       ON CONFLICT(party_id,user_id)
       DO UPDATE SET
         status='INVITED',
         character_id=NULL
       WHERE party_members.status IN ('INVITED','DECLINED')
       RETURNING user_id`,
      [id,body.data.userId],
    );

    if(!invitation.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error:"already_member",
          message:"That player is already a member of this party.",
        },
        {status:409},
      );
    }

    await client.query(
      `DELETE FROM party_invitation_preferred_characters
       WHERE party_id=$1 AND user_id=$2`,
      [id,body.data.userId],
    );

    if(preferredCharacterIds.length>0) {
      await client.query(
        `INSERT INTO party_invitation_preferred_characters(
           party_id,
           user_id,
           character_id
         )
         SELECT $1,$2,preferred_character_id
         FROM unnest($3::uuid[]) AS preferred(preferred_character_id)`,
        [id,body.data.userId,preferredCharacterIds],
      );
    }

    await client.query(
      `INSERT INTO audit_log(
         user_id,
         action,
         entity_type,
         entity_id,
         metadata
       )
       VALUES(
         $1,
         'PARTY_INVITE',
         'party',
         $2,
         jsonb_build_object(
           'invited_user_id',$3::text,
           'preferred_character_ids',to_jsonb($4::uuid[])
         )
       )`,
      [leader.id,id,body.data.userId,preferredCharacterIds],
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
