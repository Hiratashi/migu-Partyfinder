import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { characterAllowed, remainingNeeds } from "@/lib/party-composition";
import { syncPartyOpenFull } from "@/lib/partyState";

const schema=z.object({characterId:z.string().uuid()});

type Party={
  id:string;
  party_size:number;
  need_physical:number;
  need_magical:number;
  need_support:number;
  composition_restricted:boolean;
  status:string;
};

type Member={
  user_id:string;
  damage_type:string|null;
  role:string|null;
};

export async function POST(
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
  const body=schema.safeParse(await req.json().catch(()=>null));

  if(!body.success) {
    return NextResponse.json({error:"invalid_input"},{status:400});
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    const pr=await client.query<Party>(`
      SELECT
        p.id,
        r.party_size,
        p.need_physical,
        p.need_magical,
        p.need_support,
        p.composition_restricted,
        p.status
      FROM parties p
      JOIN raids r ON r.id=p.raid_id
      WHERE p.id=$1
      FOR UPDATE
    `,[id]);

    if(!pr.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"party_not_found"},{status:404});
    }

    const party=pr.rows[0];

    if(!["OPEN","FULL"].includes(party.status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"party_unavailable"},{status:409});
    }

    const cr=await client.query<{
      id:string;
      damage_type:string;
      role:string;
    }>(`
      SELECT ch.id,c.damage_type,c.role
      FROM characters ch
      JOIN classes c ON c.id=ch.class_id
      WHERE ch.id=$1 AND ch.user_id=$2 AND ch.archived_at IS NULL
    `,[body.data.characterId,user.id]);

    if(!cr.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"invalid_character"},{status:400});
    }

    const mr=await client.query<Member>(`
      SELECT pm.user_id,c.damage_type,c.role
      FROM party_members pm
      LEFT JOIN characters ch ON ch.id=pm.character_id
      LEFT JOIN classes c ON c.id=ch.class_id
      WHERE pm.party_id=$1
        AND pm.status='ACCEPTED'
        AND pm.user_id<>$2
    `,[id,user.id]);

    const already=await client.query(
      `SELECT 1
       FROM party_members
       WHERE party_id=$1 AND user_id=$2 AND status='ACCEPTED'`,
      [id,user.id],
    );

    const acceptedCount=mr.rows.length+(already.rowCount?1:0);

    if(!already.rowCount&&acceptedCount>=party.party_size) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"party_full"},{status:409});
    }

    const remaining=remainingNeeds(party,mr.rows);
    const openSeats=party.party_size-mr.rows.length;

    if(!characterAllowed(
      cr.rows[0],
      remaining,
      openSeats,
      party.composition_restricted,
    )) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {error:"character_not_needed",remaining},
        {status:409},
      );
    }

    await client.query(`
      INSERT INTO party_members(
        party_id,user_id,character_id,status
      )
      VALUES($1,$2,$3,'ACCEPTED')
      ON CONFLICT(party_id,user_id)
      DO UPDATE SET
        character_id=EXCLUDED.character_id,
        status='ACCEPTED',
        joined_at=now()
    `,[id,user.id,body.data.characterId]);

    await syncPartyOpenFull(id,client);

    await client.query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'PARTY_JOIN','party',$2)",
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
