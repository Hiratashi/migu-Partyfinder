import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { characterAllowed, remainingNeeds } from "@/lib/party-composition";
import { limitWrite } from "@/lib/rate-limit";

const schema=z.object({characterId:z.string().uuid()});

type Party={
  party_size:number;
  need_physical:number;
  need_magical:number;
  need_support:number;
  composition_restricted:boolean;
  status:string;
};

type Member={
  damage_type:string|null;
  role:string|null;
};

export async function PATCH(
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
  const body=schema.safeParse(await req.json().catch(()=>null));

  if(!body.success) {
    return NextResponse.json({error:"invalid_input"},{status:400});
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    const partyR=await client.query<Party>(`
      SELECT
        p.need_physical,
        p.need_magical,
        p.need_support,
        p.composition_restricted,
        p.status,
        r.party_size
      FROM parties p
      JOIN raids r ON r.id=p.raid_id
      WHERE p.id=$1
      FOR UPDATE
    `,[id]);

    if(
      !partyR.rowCount||
      !["OPEN","FULL"].includes(partyR.rows[0].status)
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"party_unavailable"},{status:404});
    }

    const membership=await client.query(
      `SELECT 1
       FROM party_members
       WHERE party_id=$1 AND user_id=$2 AND status='ACCEPTED'`,
      [id,user.id],
    );

    if(!membership.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"not_member"},{status:403});
    }

    const character=await client.query<{
      damage_type:string;
      role:string;
    }>(`
      SELECT c.damage_type,c.role
      FROM characters ch
      JOIN classes c ON c.id=ch.class_id
      WHERE ch.id=$1
        AND ch.user_id=$2
        AND ch.archived_at IS NULL
    `,[body.data.characterId,user.id]);

    if(!character.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"invalid_character"},{status:400});
    }

    const otherMembers=await client.query<Member>(`
      SELECT c.damage_type,c.role
      FROM party_members pm
      LEFT JOIN characters ch ON ch.id=pm.character_id
      LEFT JOIN classes c ON c.id=ch.class_id
      WHERE pm.party_id=$1
        AND pm.status='ACCEPTED'
        AND pm.user_id<>$2
    `,[id,user.id]);

    const remaining=remainingNeeds(
      partyR.rows[0],
      otherMembers.rows,
    );
    const openSeats=
      partyR.rows[0].party_size-otherMembers.rows.length;

    if(!characterAllowed(
      character.rows[0],
      remaining,
      openSeats,
      partyR.rows[0].composition_restricted,
    )) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {error:"character_not_needed",remaining},
        {status:409},
      );
    }

    await client.query(
      `UPDATE party_members
       SET character_id=$1
       WHERE party_id=$2 AND user_id=$3`,
      [body.data.characterId,id,user.id],
    );

    await client.query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'PARTY_CHARACTER_CHANGE','party',$2)",
      [user.id,id],
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
