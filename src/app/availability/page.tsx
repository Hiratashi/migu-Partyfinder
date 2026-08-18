import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import GlobalAvailabilityForm from "@/components/GlobalAvailabilityForm";
import RaidPreferencesForm from "@/components/RaidPreferencesForm";
import RaidPreferenceTabs from "@/components/RaidPreferenceTabs";
import {
  getActiveRaids,
  getRaidBySlug,
  getRaidEncounters,
} from "@/lib/raids";

type C={
  id:string;
  character_name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
};

type P={
  id:string;
  enabled:boolean;
  stages:number[];
  practice_ok:boolean;
  notes:string|null;
};

type ID={id:string};
type Slot={day_of_week:number;minute_of_day:number};

export default async function Availability({
  searchParams,
}:{
  searchParams:Promise<{raid?:string}>;
}) {
  const user=await requireUser();
  const {raid:requestedSlug}=await searchParams;
  const raids=await getActiveRaids();

  const selected=
    (requestedSlug
      ? await getRaidBySlug(requestedSlug)
      : null) ??
    raids[0] ??
    null;

  const globalSlots=await query<Slot>(`
    SELECT day_of_week,minute_of_day
    FROM availability_user_weekly_slots
    WHERE user_id=$1
    ORDER BY day_of_week,minute_of_day
  `,[user.id]);

  const chars=await query<C>(`
    SELECT
      ch.id,
      ch.character_name,
      c.abbreviation,
      c.damage_type,
      c.role,
      c.icon_path
    FROM characters ch
    JOIN classes c ON c.id=ch.class_id
    WHERE ch.user_id=$1
      AND ch.archived_at IS NULL
    ORDER BY ch.character_name
  `,[user.id]);

  const initialSlots=globalSlots.rows.map(s=>({
    day:s.day_of_week,
    minute:s.minute_of_day,
  }));

  if(!selected) {
    return <main>
      <h1>Your availability</h1>
      <p className="muted">
        Set your usual weekly schedule once. It applies to every raid.
      </p>

      <GlobalAvailabilityForm initialSlots={initialSlots}/>

      <div className="card muted">
        No active raids are configured, so there are no raid preferences
        to edit right now.
      </div>
    </main>;
  }

  const encounters=await getRaidEncounters(selected.id);

  const profile=await query<P>(`
    SELECT id,enabled,stages,practice_ok,notes
    FROM availability_profiles
    WHERE user_id=$1 AND raid_id=$2
    LIMIT 1
  `,[user.id,selected.id]);

  let initial:
    undefined|{
      enabled:boolean;
      encounterIds:string[];
      characterIds:string[];
      stages:number[];
      practiceOk:boolean;
      notes:string;
    };

  if(profile.rowCount) {
    const id=profile.rows[0].id;

    const pe=await query<ID>(
      "SELECT encounter_id id FROM availability_profile_encounters WHERE profile_id=$1",
      [id],
    );

    const pc=await query<ID>(
      "SELECT character_id id FROM availability_profile_characters WHERE profile_id=$1",
      [id],
    );

    initial={
      enabled:profile.rows[0].enabled,
      encounterIds:pe.rows.map(x=>x.id),
      characterIds:pc.rows.map(x=>x.id),
      stages:profile.rows[0].stages.map(Number),
      practiceOk:profile.rows[0].practice_ok,
      notes:profile.rows[0].notes??"",
    };
  }

  return <main>
    <h1>Your availability</h1>
    <p className="muted">
      Set your usual weekly schedule once, then choose which raids you
      currently want to run.
    </p>

    <GlobalAvailabilityForm initialSlots={initialSlots}/>

    <section id="raid-preferences" className="stack raid-preferences-section">
      <div>
        <h2 style={{marginBottom:4}}>Raid preferences</h2>
        <p className="muted" style={{marginTop:0}}>
          Choose a raid to edit its participation settings.
        </p>
      </div>

      <RaidPreferenceTabs
        raids={raids.map(raid=>({
          slug:raid.slug,
          name:raid.name,
        }))}
        selectedSlug={selected.slug}
      />

      <RaidPreferencesForm
      key={selected.slug}
      raidSlug={selected.slug}
      raidName={selected.name}
      encounters={encounters}
      characters={chars.rows}
      supportedStages={selected.supported_stages}
      defaultStage={selected.default_stage}
      practiceSupported={selected.practice_supported}
      initial={initial}
    />
    </section>
  </main>;
}
