import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import PartyCard from "@/components/PartyCard";
import InvitationActions from "@/components/InvitationActions";
import { archiveExpiredParties } from "@/lib/party-lifecycle";

type Row={
  id:string;
  title:string|null;
  raid_name:string;
  start_time:Date;
  end_time:Date|null;
  difficulty_stage:number;
  is_practice:boolean;
  status:string;
  encounters:string;
  leader_id:string;
  leader_username:string;
  member_status:string|null;
  character_name:string|null;
  abbreviation:string|null;
  party_size:number;
  members:number;
  need_physical:number;
  need_magical:number;
  need_support:number;
  assigned_physical:number;
  assigned_magical:number;
  assigned_support:number;
  composition_restricted:boolean;
};

export default async function MyParties() {
  const user=await requireUser();
  await archiveExpiredParties();

  const rows=await query<Row>(`
    SELECT
      p.id,
      p.title,
      r.name raid_name,
      p.start_time,
      p.end_time,
      p.difficulty_stage,
      p.is_practice,
      p.status,
      p.leader_id,
      u.username leader_username,
      r.party_size,
      p.need_physical,
      p.need_magical,
      p.need_support,
      p.composition_restricted,
      string_agg(DISTINCT e.code, ', ' ORDER BY e.code) encounters,
      mine.status member_status,
      mine_ch.character_name,
      mine_c.abbreviation,
      count(DISTINCT members.user_id)::int members,
      count(DISTINCT members.user_id)
        FILTER (WHERE member_c.damage_type='PHYSICAL' AND member_c.role IN ('DPS','FLEX'))::int
        assigned_physical,
      count(DISTINCT members.user_id)
        FILTER (WHERE member_c.damage_type='MAGICAL' AND member_c.role IN ('DPS','FLEX'))::int
        assigned_magical,
      count(DISTINCT members.user_id)
        FILTER (WHERE member_c.role='SUPPORT')::int
        assigned_support
    FROM parties p
    JOIN raids r ON r.id=p.raid_id
    JOIN users u ON u.id=p.leader_id
    JOIN party_encounters pe ON pe.party_id=p.id
    JOIN encounters e ON e.id=pe.encounter_id
    LEFT JOIN party_members mine
      ON mine.party_id=p.id AND mine.user_id=$1
    LEFT JOIN characters mine_ch ON mine_ch.id=mine.character_id
    LEFT JOIN classes mine_c ON mine_c.id=mine_ch.class_id
    LEFT JOIN party_members members
      ON members.party_id=p.id AND members.status='ACCEPTED'
    LEFT JOIN characters member_ch ON member_ch.id=members.character_id
    LEFT JOIN classes member_c ON member_c.id=member_ch.class_id
    WHERE p.status IN ('OPEN','FULL')
      AND (
        p.leader_id=$1
        OR mine.status IN ('ACCEPTED','INVITED')
      )
    GROUP BY
      p.id,
      r.id,
      u.username,
      mine.status,
      mine_ch.character_name,
      mine_c.abbreviation
    ORDER BY p.start_time ASC
  `,[user.id]);

  const created=rows.rows.filter(r=>r.leader_id===user.id);
  const joined=rows.rows.filter(
    r=>r.leader_id!==user.id&&r.member_status==="ACCEPTED",
  );
  const invited=rows.rows.filter(
    r=>r.leader_id!==user.id&&r.member_status==="INVITED",
  );

  function card(p:Row,relation:string,actionLabel?:string) {
    const remP=Math.max(0,p.need_physical-p.assigned_physical);
    const remM=Math.max(0,p.need_magical-p.assigned_magical);
    const remS=Math.max(0,p.need_support-p.assigned_support);

    return <PartyCard
      party={{
        id:p.id,
        title:p.title,
        raidName:p.raid_name,
        creator:p.leader_username,
        start:new Date(p.start_time).toISOString(),
        end:p.end_time?new Date(p.end_time).toISOString():null,
        encounters:p.encounters,
        difficultyStage:p.difficulty_stage,
        isPractice:p.is_practice,
        status:p.status,
        joined:p.members,
        partySize:p.party_size,
        remainingPhysical:remP,
        remainingMagical:remM,
        remainingSupport:remS,
        compositionRestricted:p.composition_restricted,
      }}
      relation={relation}
      actionLabel={actionLabel}
    />;
  }

  const section=(
    title:string,
    items:Row[],
    empty:string,
    render:(p:Row)=>React.ReactNode,
  )=><>
    <h2 className="section-title">{title}</h2>
    <div className="grid">
      {items.length===0&&<div className="card muted">{empty}</div>}
      {items.map(render)}
    </div>
  </>;

  return <main>
    <div className="row between">
      <div>
        <h1>My parties</h1>
        <p className="muted">
          Everything you created, joined, or were invited to.
        </p>
      </div>
      <Link className="btn primary" href="/parties/new">+ Create Party</Link>
    </div>

    {section(
      "Created by me",
      created,
      "You do not currently have any open parties you created.",
      p=><div className="stack" key={p.id}>
        {card(p,"Leader","Manage party")}
      </div>,
    )}

    {section(
      "Joined",
      joined,
      "You have not joined any upcoming parties.",
      p=><div className="stack" key={p.id}>
        {card(
          p,
          p.character_name
            ? `Joined - ${p.character_name}${p.abbreviation?` (${p.abbreviation})`:""}`
            : "Joined",
        )}
      </div>,
    )}

    {section(
      "Invitations",
      invited,
      "You have no pending invitations.",
      p=><div className="stack" key={p.id}>
        {card(p,"Invited","Review invitation")}
        <InvitationActions partyId={p.id} showView={false}/>
      </div>,
    )}
  </main>;
}
