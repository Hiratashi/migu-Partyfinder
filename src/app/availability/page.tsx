import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import WeeklyAvailabilityForm from "@/components/WeeklyAvailabilityForm";
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

  if(!selected) {
    return <main>
      <h1>Your availability</h1>
      <div className="card muted">No active raids are configured.</div>
    </main>;
  }

  const encounters=await getRaidEncounters(selected.id);

  const profile=await query<P>(`
    SELECT id,stages,practice_ok,notes
    FROM availability_profiles
    WHERE user_id=$1 AND raid_id=$2
    LIMIT 1
  `,[user.id,selected.id]);

  let initial:
    undefined|{
      encounterIds:string[];
      characterIds:string[];
      stages:number[];
      practiceOk:boolean;
      notes:string;
      slots:{day:number;minute:number}[];
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
    const ps=await query<Slot>(
      "SELECT day_of_week,minute_of_day FROM availability_weekly_slots WHERE profile_id=$1 ORDER BY day_of_week,minute_of_day",
      [id],
    );

    initial={
      encounterIds:pe.rows.map(x=>x.id),
      characterIds:pc.rows.map(x=>x.id),
      stages:profile.rows[0].stages.map(Number),
      practiceOk:profile.rows[0].practice_ok,
      notes:profile.rows[0].notes??"",
      slots:ps.rows.map(s=>({
        day:s.day_of_week,
        minute:s.minute_of_day,
      })),
    };
  }

  return <main>
    <h1>Your availability</h1>
    <p className="muted">
      Your weekly schedule is stored separately for each raid.
    </p>

    <div className="row raid-tabs">
      {raids.map(raid=>
        <Link
          key={raid.id}
          href={`/availability?raid=${encodeURIComponent(raid.slug)}`}
          className={`btn ${raid.slug===selected.slug?"active-nav":""}`}
        >
          {raid.name}
        </Link>
      )}
    </div>

    {chars.rows.length
      ? <WeeklyAvailabilityForm
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
      : <div className="card">
          Add at least one character in your profile before publishing
          availability.
        </div>
    }
  </main>;
}
