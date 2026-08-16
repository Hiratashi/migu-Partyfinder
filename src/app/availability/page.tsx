import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import WeeklyAvailabilityForm from "@/components/WeeklyAvailabilityForm";
type E={id:string;code:string};
type C={id:string;character_name:string;abbreviation:string;damage_type:string;role:string};
type P={id:string;stages:number[];practice_ok:boolean;notes:string|null};
type ID={id:string}; type Slot={day_of_week:number;minute_of_day:number};
export default async function Availability(){
  const user=await requireUser();
  const enc=await query<E>(`SELECT e.id,e.code FROM encounters e JOIN raids r ON r.id=e.raid_id WHERE r.slug='doom-aporia' ORDER BY e.sort_order`);
  const chars=await query<C>(`SELECT ch.id,ch.character_name,c.abbreviation,c.damage_type,c.role FROM characters ch JOIN classes c ON c.id=ch.class_id WHERE ch.user_id=$1 ORDER BY ch.character_name`,[user.id]);
  const profile=await query<P>(`SELECT ap.id,ap.stages,ap.practice_ok,ap.notes FROM availability_profiles ap JOIN raids r ON r.id=ap.raid_id WHERE ap.user_id=$1 AND r.slug='doom-aporia' LIMIT 1`,[user.id]);
  let initial:undefined|{encounterIds:string[];characterIds:string[];stages:number[];practiceOk:boolean;notes:string;slots:{day:number;minute:number}[]};
  if(profile.rowCount){const id=profile.rows[0].id;const pe=await query<ID>('SELECT encounter_id id FROM availability_profile_encounters WHERE profile_id=$1',[id]);const pc=await query<ID>('SELECT character_id id FROM availability_profile_characters WHERE profile_id=$1',[id]);const ps=await query<Slot>('SELECT day_of_week,minute_of_day FROM availability_weekly_slots WHERE profile_id=$1 ORDER BY day_of_week,minute_of_day',[id]);initial={encounterIds:pe.rows.map(x=>x.id),characterIds:pc.rows.map(x=>x.id),stages:profile.rows[0].stages.map(Number),practiceOk:profile.rows[0].practice_ok,notes:profile.rows[0].notes??'',slots:ps.rows.map(s=>({day:s.day_of_week,minute:s.minute_of_day}))};}
  return <main><h1>Your availability</h1><p className="muted">This is your persistent weekly raid schedule. Set it once, then update it whenever your usual availability changes.</p>{chars.rows.length?<WeeklyAvailabilityForm encounters={enc.rows} characters={chars.rows} initial={initial}/>:<div className="card">Add at least one character in your profile before publishing availability.</div>}</main>;
}
