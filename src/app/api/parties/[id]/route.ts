import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { partySchema } from "@/data/validation";
import { db, query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { getRaidById, raidSupportsStage } from "@/lib/raids";
import { limitWrite } from "@/lib/rate-limit";
import { notifyUsers } from "@/lib/notifications";
import type { NotificationChange } from "@/lib/notifications";
import { requestReconfirmation } from "@/lib/reconfirmation";

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
  const parsed=partySchema.safeParse(
    await req.json().catch(()=>null),
  );

  if(!parsed.success) {
    return NextResponse.json(
      {error:"invalid_input",issues:parsed.error.issues},
      {status:400},
    );
  }

  const owned=await query<{raid_id:string;composition_model:string}>(`
    SELECT raid_id,composition_model
    FROM parties
    WHERE id=$1
      AND leader_id=$2
      AND status IN ('OPEN','FULL')
  `,[id,user.id]);

  if(!owned.rowCount) {
    return NextResponse.json({error:"forbidden"},{status:403});
  }

  const raid=await getRaidById(owned.rows[0].raid_id);
  if(!raid) {
    return NextResponse.json({error:"raid_unavailable"},{status:404});
  }

  const d=parsed.data;
  if(d.compositionModel!==owned.rows[0].composition_model) {
    return NextResponse.json({error:"composition_model_locked"},{status:409});
  }

  if(!raidSupportsStage(raid,d.difficultyStage)) {
    return NextResponse.json(
      {error:"unsupported_stage"},
      {status:400},
    );
  }

  if(d.isPractice&&!raid.practice_supported) {
    return NextResponse.json(
      {error:"practice_not_supported"},
      {status:400},
    );
  }

  if(
    (d.compositionModel==="DPS_SUPPORT"?d.needDps:d.needPhysical+d.needMagical)+d.needSupport >
    raid.party_size
  ) {
    return NextResponse.json(
      {error:"composition_exceeds_party_size"},
      {status:400},
    );
  }

  const allEncounterIds=[
    ...new Set([...d.encounters,...d.practiceEncounterIds]),
  ];

  const allowed=await query<{id:string;code:string;name:string}>(`
    SELECT id,code,name
    FROM encounters
    WHERE raid_id=$1
  `,[raid.id]);

  const allowedIds=new Set(allowed.rows.map(row=>row.id));
  if(allEncounterIds.some(encounterId=>!allowedIds.has(encounterId))) {
    return NextResponse.json({error:"invalid_encounter"},{status:400});
  }

  const client=await db.connect();

  try {
    await client.query("BEGIN");

    const before=await client.query<{
      title:string|null;
      start_time:Date;
      end_time:Date|null;
      difficulty_stage:number;
      is_practice:boolean;
      need_physical:number;
      need_magical:number;
      need_dps:number;
      need_support:number;
      composition_restricted:boolean;
      encounters:string[];
      practice_encounters:string[];
    }>(`
      SELECT p.title,p.start_time,p.end_time,p.difficulty_stage,p.is_practice,
             p.need_physical,p.need_magical,p.need_dps,p.need_support,
             p.composition_restricted,
             ARRAY(SELECT encounter_id::text FROM party_encounters WHERE party_id=p.id ORDER BY encounter_id) AS encounters,
             ARRAY(SELECT encounter_id::text FROM party_practice_encounters WHERE party_id=p.id ORDER BY encounter_id) AS practice_encounters
      FROM parties p
      WHERE p.id=$1 AND p.leader_id=$2 AND p.status IN ('OPEN','FULL')
      FOR UPDATE OF p
    `,[id,user.id]);
    if(!before.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"forbidden"},{status:403});
    }
    const previous=before.rows[0];
    const changes:string[]=[];
    const changeDetails:NotificationChange[]=[];
    const add=(group:string,label:string,from:string,to:string,format?:"datetime")=>{
      if(from===to)return;
      if(!changes.includes(group))changes.push(group);
      changeDetails.push({label,before:from,after:to,format});
    };
    add("title","Title",previous.title||"Untitled party",d.title||"Untitled party");
    add("time","Start time",previous.start_time.toISOString(),new Date(d.startTime).toISOString(),"datetime");
    add("time","End time",previous.end_time?.toISOString()??"None",d.endTime?new Date(d.endTime).toISOString():"None","datetime");
    add("stage","Stage",String(previous.difficulty_stage),String(d.difficultyStage));
    add("practice mode","Practice mode",previous.is_practice?"Yes":"No",d.isPractice?"Yes":"No");
    const composition=(physical:number,magical:number,dps:number,support:number)=>
      `${d.compositionModel==="DPS_SUPPORT"?`${dps} DPS`:`${physical} physical, ${magical} magical`}, ${support} support`;
    add("role composition","Role composition",
      composition(previous.need_physical,previous.need_magical,previous.need_dps,previous.need_support),
      composition(d.needPhysical,d.needMagical,d.needDps,d.needSupport));
    add("role composition","Role matching",
      previous.composition_restricted?"Enforced":"Open",
      d.compositionRestricted?"Enforced":"Open");
    const names=new Map(allowed.rows.map(row=>[row.id,`${row.code} ${row.name}`]));
    const encounterText=(ids:string[])=>ids.map(id=>names.get(id)??id).sort().join(", ")||"None";
    add("encounters","Encounters",encounterText(previous.encounters),encounterText(d.encounters));
    add("encounters","Practice encounters",encounterText(previous.practice_encounters),encounterText(d.practiceEncounterIds));

    await client.query(`
      UPDATE parties
      SET
        title=$1,
        start_time=$2,
        end_time=$3,
        difficulty_stage=$4,
        is_practice=$5,
        practice_encounter_id=NULL,
        need_physical=$6,
        need_magical=$7,
        need_support=$8,
        composition_restricted=$9,
        need_dps=$11,
        updated_at=now()
      WHERE id=$10
    `,[
      d.title||null,
      d.startTime,
      d.endTime??null,
      d.difficultyStage,
      d.isPractice,
      d.needPhysical,
      d.needMagical,
      d.needSupport,
      d.compositionRestricted,
      id,
      d.needDps,
    ]);

    await client.query(
      "DELETE FROM party_encounters WHERE party_id=$1",
      [id],
    );
    await client.query(
      "DELETE FROM party_practice_encounters WHERE party_id=$1",
      [id],
    );

    for(const e of d.encounters) {
      await client.query(
        "INSERT INTO party_encounters(party_id,encounter_id) VALUES($1,$2)",
        [id,e],
      );
    }

    for(const e of d.practiceEncounterIds) {
      await client.query(
        "INSERT INTO party_practice_encounters(party_id,encounter_id) VALUES($1,$2)",
        [id,e],
      );
    }

    await client.query(
      "INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'PARTY_EDIT','party',$2)",
      [user.id,id],
    );

    if(changes.length) {
      const recipients=await requestReconfirmation(client,id,user.id,changeDetails);
      await notifyUsers(client,{
        partyId:id,
        recipients,
        kind:"PARTY_CHANGED",
        title:"Party details changed",
        body:`The party ${changes.join(", ")} changed. Open the party link to review and accept the changes, or decline and leave the party.`,
        changeDetails,
      });
    }

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
