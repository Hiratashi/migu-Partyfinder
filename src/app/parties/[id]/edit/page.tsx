import { notFound,redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import PartyForm from "@/components/PartyForm";
import { getRaidById, getRaidEncounters } from "@/lib/raids";

type P={
  id:string;
  leader_id:string;
  raid_id:string;
  title:string|null;
  start_time:Date;
  end_time:Date|null;
  difficulty_stage:number;
  is_practice:boolean;
  need_physical:number;
  need_magical:number;
  need_support:number;
  composition_restricted:boolean;
};

export default async function Edit({
  params,
}:{
  params:Promise<{id:string}>;
}) {
  const u=await requireUser();
  const {id}=await params;

  const p=await query<P>(
    "SELECT * FROM parties WHERE id=$1",
    [id],
  );

  if(!p.rowCount)notFound();
  const x=p.rows[0];

  if(x.leader_id!==u.id)redirect(`/parties/${id}`);

  const raid=await getRaidById(x.raid_id);
  if(!raid)notFound();

  const encounters=await getRaidEncounters(raid.id);

  const sel=await query<{encounter_id:string}>(
    "SELECT encounter_id FROM party_encounters WHERE party_id=$1",
    [id],
  );
  const practice=await query<{encounter_id:string}>(
    "SELECT encounter_id FROM party_practice_encounters WHERE party_id=$1",
    [id],
  );

  return <main>
    <div className="eyebrow">{raid.name}</div>
    <h1>Edit party</h1>

    <PartyForm
      partyId={id}
      raidSlug={raid.slug}
      raidName={raid.name}
      partySize={raid.party_size}
      supportedStages={raid.supported_stages}
      defaultStage={raid.default_stage}
      practiceSupported={raid.practice_supported}
      encounters={encounters}
      initial={{
        title:x.title??"",
        encounters:sel.rows.map(s=>s.encounter_id),
        startTime:new Date(x.start_time).toISOString(),
        endTime:x.end_time
          ? new Date(x.end_time).toISOString()
          : null,
        difficultyStage:x.difficulty_stage,
        isPractice:x.is_practice,
        practiceEncounterIds:practice.rows.map(s=>s.encounter_id),
        needPhysical:x.need_physical,
        needMagical:x.need_magical,
        needSupport:x.need_support,
        compositionRestricted:x.composition_restricted,
      }}
    />
  </main>;
}
