import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import JoinParty from "@/components/JoinParty";
import InviteUser from "@/components/InviteUser";
import LocalDateTime from "@/components/LocalDateTime";
type P={id:string;title:string|null;start_time:Date;end_time:Date|null;difficulty_stage:number;is_practice:boolean;leader:string;leader_id:string;encounters:string;practice_code:string|null;need_physical:number;need_magical:number;need_support:number};
type Char={id:string;character_name:string;name:string;abbreviation:string;damage_type:string;role:string};
type Mem={display:string;character_name:string|null;abbreviation:string|null;damage_type:string|null;role:string|null};
type Candidate={id:string;display:string};
export default async function PartyPage({params}:{params:Promise<{id:string}>}){
  const user=await requireUser(); const {id}=await params;
  const p=await query<P>(`SELECT p.id,p.title,p.start_time,p.end_time,p.difficulty_stage,p.is_practice,p.leader_id,COALESCE(u.display_name,u.username) leader,string_agg(DISTINCT e.code, ', ' ORDER BY e.code) encounters,pr.code practice_code,p.need_physical,p.need_magical,p.need_support FROM parties p JOIN users u ON u.id=p.leader_id JOIN party_encounters pe ON pe.party_id=p.id JOIN encounters e ON e.id=pe.encounter_id LEFT JOIN encounters pr ON pr.id=p.practice_encounter_id WHERE p.id=$1 GROUP BY p.id,u.display_name,u.username,pr.code`,[id]);
  if(!p.rowCount)notFound(); const party=p.rows[0];
  const chars=await query<Char>(`SELECT ch.id,ch.character_name,c.name,c.abbreviation,c.damage_type,c.role FROM characters ch JOIN classes c ON c.id=ch.class_id WHERE ch.user_id=$1 ORDER BY ch.character_name`,[user.id]);
  const members=await query<Mem>(`SELECT COALESCE(u.display_name,u.username) display,ch.character_name,c.abbreviation,c.damage_type,c.role FROM party_members pm JOIN users u ON u.id=pm.user_id LEFT JOIN characters ch ON ch.id=pm.character_id LEFT JOIN classes c ON c.id=ch.class_id WHERE pm.party_id=$1 AND pm.status='ACCEPTED' ORDER BY pm.joined_at`,[id]);
  const candidates = party.leader_id===user.id ? await query<Candidate>(`SELECT u.id,COALESCE(u.display_name,u.username) display FROM users u WHERE u.id<>$1 AND NOT EXISTS(SELECT 1 FROM party_members pm WHERE pm.party_id=$2 AND pm.user_id=u.id AND pm.status IN ('ACCEPTED','INVITED')) ORDER BY display LIMIT 100`,[user.id,id]) : {rows:[] as Candidate[]};
  return <main><div className="card stack"><div className="row between"><div><div className="muted">DOOM APORIA</div><h1>{party.title||party.encounters}</h1></div><span className="pill">{party.is_practice?`Practice ${party.practice_code??""}`:"Clear"}</span></div><p><strong>{party.encounters}</strong> · Difficulty Stage {party.difficulty_stage}</p><p><span className="muted">Starts:</span> <LocalDateTime iso={new Date(party.start_time).toISOString()}/>{party.end_time&&<> — <LocalDateTime iso={new Date(party.end_time).toISOString()} timeOnly/></>}</p><p className="need">Needs: {party.need_physical} Physical · {party.need_magical} Magical · {party.need_support} Support</p><JoinParty partyId={id} characters={chars.rows}/>{party.leader_id===user.id&&<InviteUser partyId={id} users={candidates.rows}/>}</div><h2 className="section-title">Party members</h2><div className="grid">{members.rows.map((m,i)=><div className="card row" key={i}><div className="classicon">{m.abbreviation??"?"}</div><div><strong>{m.display}</strong><div className="muted">{m.character_name??"No character selected"}{m.damage_type?` · ${m.damage_type} ${m.role}`:""}</div></div></div>)}</div></main>
}
