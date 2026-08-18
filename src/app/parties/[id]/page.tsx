import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import JoinParty from "@/components/JoinParty";
import InviteUser from "@/components/InviteUser";
import LocalDateTime from "@/components/LocalDateTime";
import PartyActions from "@/components/PartyActions";
import KickMemberButton from "@/components/KickMemberButton";
import MatchInviteButton from "@/components/MatchInviteButton";
import CompositionRestrictionToggle from "@/components/CompositionRestrictionToggle";
import ChangeCharacter from "@/components/ChangeCharacter";
import ClassIcon from "@/components/ClassIcon";
import RevokeInvitationButton from "@/components/RevokeInvitationButton";
import { archiveExpiredParties } from "@/lib/party-lifecycle";
import {
  weeklyScheduleCovers,
  type WeeklySlot,
} from "@/lib/weekly-availability";
import { characterAllowed, remainingNeeds } from "@/lib/party-composition";
import CopyCharacterName from "@/components/CopyCharacterName";

type P={
  id:string;
  title:string|null;
  raid_name:string;
  start_time:Date;
  end_time:Date|null;
  difficulty_stage:number;
  is_practice:boolean;
  leader:string;
  leader_username:string;
  leader_id:string;
  raid_id:string;
  party_size:number;
  encounters:string;
  practice_codes:string|null;
  need_physical:number;
  need_magical:number;
  need_support:number;
  composition_restricted:boolean;
  status:string;
};

type Char={
  id:string;
  character_name:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
};

type Mem={
  user_id:string;
  display:string;
  username:string;
  character_id:string|null;
  character_name:string|null;
  abbreviation:string|null;
  damage_type:string|null;
  role:string|null;
  icon_path:string|null;
};

type Candidate={id:string;display:string};

type PendingInvite={
  user_id:string;
  display:string;
  username:string;
};

type MatchCharacter={
  id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
};

type RawProfile={
  profile_id:string;
  user_id:string;
  display:string;
  username:string;
  timezone:string;
  stages:number[];
  practice_ok:boolean;
  notes:string|null;
  encounter_ids:string[];
  characters:MatchCharacter[];
  slots:WeeklySlot[];
};

export default async function PartyPage({
  params,
}:{
  params:Promise<{id:string}>;
}) {
  const user=await requireUser();
  await archiveExpiredParties();
  const {id}=await params;

  const p=await query<P>(`
    SELECT
      p.id,
      p.title,
      p.start_time,
      p.end_time,
      p.difficulty_stage,
      p.is_practice,
      p.leader_id,
      p.raid_id,
      p.status,
      p.composition_restricted,
      r.name raid_name,r.party_size,
      COALESCE(u.display_name,u.username) leader,
      u.username leader_username,
      string_agg(DISTINCT e.code, ', ' ORDER BY e.code) encounters,
      (
        SELECT string_agg(e2.code, ', ' ORDER BY e2.code)
        FROM party_practice_encounters ppe
        JOIN encounters e2 ON e2.id=ppe.encounter_id
        WHERE ppe.party_id=p.id
      ) practice_codes,
      p.need_physical,
      p.need_magical,
      p.need_support
    FROM parties p
    JOIN raids r ON r.id=p.raid_id
    JOIN users u ON u.id=p.leader_id
    JOIN party_encounters pe ON pe.party_id=p.id
    JOIN encounters e ON e.id=pe.encounter_id
    WHERE p.id=$1
    GROUP BY p.id,r.name,r.party_size,u.display_name,u.username
  `,[id]);

  if(!p.rowCount)notFound();
  const party=p.rows[0];

  const partyEncounterRows=await query<{id:string}>(
    "SELECT encounter_id id FROM party_encounters WHERE party_id=$1",
    [id],
  );
  const partyEncounterIds=new Set(
    partyEncounterRows.rows.map(x=>x.id),
  );

  const chars=await query<Char>(`
    SELECT
      ch.id,
      ch.character_name,
      c.name,
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

  const members=await query<Mem>(`
    SELECT
      pm.user_id,
      COALESCE(u.display_name,u.username) display,
      u.username,
      pm.character_id,
      ch.character_name,
      c.abbreviation,
      c.damage_type,
      c.role,
      c.icon_path
    FROM party_members pm
    JOIN users u ON u.id=pm.user_id
    LEFT JOIN characters ch ON ch.id=pm.character_id
    LEFT JOIN classes c ON c.id=ch.class_id
    WHERE pm.party_id=$1
      AND pm.status='ACCEPTED'
    ORDER BY pm.joined_at
  `,[id]);

  const membership=await query<{status:string}>(`
    SELECT status
    FROM party_members
    WHERE party_id=$1 AND user_id=$2
    LIMIT 1
  `,[id,user.id]);

  const membershipStatus=membership.rows[0]?.status??null;
  const isMember=membershipStatus==="ACCEPTED";
  const isInvited=membershipStatus==="INVITED";
  const canManage=
    party.leader_id===user.id &&
    ["OPEN","FULL"].includes(party.status);

  const currentRemaining=remainingNeeds(party,members.rows);
  const openSeats=Math.max(0,party.party_size-members.rows.length);
  const canInvite=canManage&&openSeats>0;

  const userCharacters=chars.rows.map(c=>{
    const eligible=characterAllowed(
      c,
      currentRemaining,
      openSeats,
      party.composition_restricted,
    );
    return {
      ...c,
      eligible,
      reason:eligible?undefined:"not currently needed",
    };
  });

  const currentUserMember=members.rows.find(m=>m.user_id===user.id);

  const otherMembersForChange=members.rows.filter(
    m=>m.user_id!==user.id,
  );
  const remainingWithoutUser=remainingNeeds(
    party,
    otherMembersForChange,
  );
  const openSeatsForChange=Math.max(
    1,
    party.party_size-otherMembersForChange.length,
  );
  const changeCharacters=chars.rows.map(c=>{
    const eligible=characterAllowed(
      c,
      remainingWithoutUser,
      openSeatsForChange,
      party.composition_restricted,
    );
    return {
      ...c,
      eligible,
      reason:eligible?undefined:"not currently needed",
    };
  });

  const pendingInvites=canManage
    ? await query<PendingInvite>(`
        SELECT
          pm.user_id,
          COALESCE(u.display_name,u.username) display,
          u.username
        FROM party_members pm
        JOIN users u ON u.id=pm.user_id
        WHERE pm.party_id=$1
          AND pm.status='INVITED'
        ORDER BY display
      `,[id])
    : {rows:[] as PendingInvite[]};

  const candidates=canInvite
    ? await query<Candidate>(`
        SELECT
          u.id,
          COALESCE(u.display_name,u.username) display
        FROM users u
        WHERE u.id<>$1
          AND NOT EXISTS(
            SELECT 1
            FROM party_members pm
            WHERE pm.party_id=$2
              AND pm.user_id=u.id
              AND pm.status IN ('ACCEPTED','INVITED')
          )
        ORDER BY display
        LIMIT 100
      `,[user.id,id])
    : {rows:[] as Candidate[]};

  const profiles=canInvite
    ? await query<RawProfile>(`
        SELECT
          ap.id profile_id,
          u.id user_id,
          COALESCE(u.display_name,u.username) display,
          u.username,
          u.timezone,
          ap.stages,
          ap.practice_ok,
          ap.notes,
          COALESCE((
            SELECT jsonb_agg(ape.encounter_id)
            FROM availability_profile_encounters ape
            WHERE ape.profile_id=ap.id
          ),'[]'::jsonb) encounter_ids,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id',ch.id,
                'name',ch.character_name,
                'abbreviation',c.abbreviation,
                'damage_type',c.damage_type,
                'role',c.role
              )
              ORDER BY ch.character_name
            )
            FROM availability_profile_characters apc
            JOIN characters ch
              ON ch.id=apc.character_id
             AND ch.user_id=ap.user_id
            JOIN classes c ON c.id=ch.class_id
            WHERE apc.profile_id=ap.id
          ),'[]'::jsonb) characters,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'day_of_week',aws.day_of_week,
                'minute_of_day',aws.minute_of_day
              )
              ORDER BY aws.day_of_week,aws.minute_of_day
            )
            FROM availability_user_weekly_slots aws
            WHERE aws.user_id=ap.user_id
          ),'[]'::jsonb) slots
        FROM availability_profiles ap
        JOIN users u ON u.id=ap.user_id
        WHERE ap.raid_id=$1
          AND ap.enabled=true
          AND ap.user_id<>$2
          AND NOT EXISTS(
            SELECT 1
            FROM party_members pm
            WHERE pm.party_id=$3
              AND pm.user_id=ap.user_id
              AND pm.status IN ('ACCEPTED','INVITED')
          )
        ORDER BY display
      `,[party.raid_id,user.id,id])
    : {rows:[] as RawProfile[]};

  const matches=profiles.rows.flatMap(profile=>{
    const stages=(profile.stages??[]).map(Number);
    if(!stages.includes(party.difficulty_stage))return [];
    if(party.is_practice&&!profile.practice_ok)return [];

    const availableEncounters=new Set(profile.encounter_ids??[]);
    if(
      [...partyEncounterIds].some(
        encounterId=>!availableEncounters.has(encounterId),
      )
    ) return [];

    if(!weeklyScheduleCovers(
      new Date(party.start_time),
      party.end_time?new Date(party.end_time):null,
      profile.timezone,
      profile.slots??[],
    )) return [];

    const fitting=(profile.characters??[]).filter(
      c=>characterAllowed(
        c,
        currentRemaining,
        openSeats,
        party.composition_restricted,
      ),
    );

    if(!fitting.length)return [];

    return [{
      ...profile,
      fittingCharacters:fitting,
      hasPhysical:fitting.some(
        c=>c.damage_type==="PHYSICAL"&&["DPS","FLEX"].includes(c.role),
      ),
      hasMagical:fitting.some(
        c=>c.damage_type==="MAGICAL"&&["DPS","FLEX"].includes(c.role),
      ),
      hasSupport:fitting.some(c=>c.role==="SUPPORT"),
    }];
  });

  return <main>
    <div className="card stack">
      <div className="row between">
        <div>
          <div className="muted">{party.raid_name}</div>
          <h1>{party.title||party.encounters}</h1>
          <div className="muted">
            Created by <strong>@{party.leader_username}</strong>
          </div>
        </div>

        <div className="row">
          <span className="pill">{party.status}</span>
          <span className="pill">
            {party.is_practice
              ? `Practice: ${party.practice_codes??"selected fights"}`
              : "Clear"}
          </span>
        </div>
      </div>

      <p>
        <strong>{party.encounters}</strong> - Difficulty Stage{" "}
        {party.difficulty_stage}
      </p>

	<p>
	  <span className="muted">Starts:</span>{" "}
	  <LocalDateTime iso={new Date(party.start_time).toISOString()}/>
	  {party.end_time&&<>
		{" - "}
		<LocalDateTime
		  iso={new Date(party.end_time).toISOString()}
		/>
	  </>}
	</p>

      <div>
        <div className="muted">Requested composition</div>
        <strong>
          {party.need_physical} Physical  - {" "}
          {party.need_magical} Magical  - {" "}
          {party.need_support} Support
        </strong>
      </div>

      <div className="need">
        Still requested: {currentRemaining.physical} Physical  - {" "}
        {currentRemaining.magical} Magical  - {" "}
        {currentRemaining.support} Support{" "}
        <span className="muted">
          - {members.rows.length}/{party.party_size} players
        </span>
      </div>

      {canManage&&
        <CompositionRestrictionToggle
          partyId={id}
          restricted={party.composition_restricted}
        />
      }

      {!canManage&&
        <span className="pill">
          Role matching: {party.composition_restricted?"Enforced":"Open"}
        </span>
      }

      <PartyActions
        partyId={id}
        isLeader={party.leader_id===user.id}
        isMember={isMember}
        status={party.status}
      />

      {!isMember&&["OPEN","FULL"].includes(party.status)&&
        (openSeats>0
          ? <JoinParty
              partyId={id}
              characters={userCharacters}
              invited={isInvited}
            />
          : <div className="card muted">
              This party is currently full.
            </div>
        )
      }

      {canInvite&&candidates.rows.length>0&&
        <InviteUser partyId={id} users={candidates.rows}/>
      }
    </div>

    {canManage&&pendingInvites.rows.length>0&&<>
      <h2 className="section-title">Pending invitations</h2>
      <div className="grid">
        {pendingInvites.rows.map(invite=>
          <article className="card row between" key={invite.user_id}>
            <div>
              <strong>{invite.display}</strong>{" "}
              <span className="muted">@{invite.username}</span>
              <div className="muted">Waiting for a response</div>
            </div>
            <RevokeInvitationButton
              partyId={id}
              userId={invite.user_id}
            />
          </article>
        )}
      </div>
    </>}

    {canInvite&&<>
      <h2 className="section-title">Available players</h2>
      <p className="muted">
        Matching checks weekly availability, selected fights, Stage{" "}
        {party.difficulty_stage}, practice preference and{" "}
        {party.composition_restricted
          ? "the currently requested roles"
          : "any selected character because role restrictions are open"}.
      </p>

      <div className="grid">
        {matches.length===0&&
          <div className="card muted">
            No compatible players found.{" "}
            {profiles.rows.length===0
              ? "No other player has saved availability for this raid yet."
              : `${profiles.rows.length} saved availability profile${
                  profiles.rows.length===1?" was":"s were"
                } checked, but none matched every requirement.`}
          </div>
        }

        {matches.map(m=>
          <article className="card stack" key={m.user_id}>
            <div>
              <strong>{m.display}</strong>{" "}
              <span className="muted">@{m.username}</span>
            </div>
            <span className="muted">
              {m.fittingCharacters.map(
                c=>`${c.name} (${c.abbreviation}, ${c.damage_type} ${c.role})`,
              ).join(", ")}
            </span>
            <div className="row">
              {m.hasPhysical&&<span className="pill">Physical</span>}
              {m.hasMagical&&<span className="pill">Magical</span>}
              {m.hasSupport&&<span className="pill">Support</span>}
            </div>
            {m.notes&&<span>{m.notes}</span>}
            <MatchInviteButton partyId={id} userId={m.user_id}/>
          </article>
        )}
      </div>
    </>}

    {canManage&&openSeats===0&&
      <div className="card muted section-title">
        The party is full. Player matching and new invitations are paused
        until a slot opens again.
      </div>
    }

    <h2 className="section-title">Party members</h2>
    <div className="grid">
      {members.rows.map(m=>
        <div className="card stack" key={m.user_id}>
          <div className="row between">
            <div className="row">
              <ClassIcon
                src={m.icon_path}
                abbreviation={m.abbreviation??"?"}
                name={m.character_name??undefined}
              />
              <div>
                <strong>{m.display}</strong>{" "}
                <span className="muted">@{m.username}</span>
                <div className="muted">
                  {m.character_name?<CopyCharacterName name={m.character_name}/>:"No character selected"}
                  {m.damage_type?` - ${m.damage_type} ${m.role}`:""}
                </div>
              </div>
            </div>

            {canManage&&m.user_id!==user.id&&
              <KickMemberButton
                partyId={id}
                userId={m.user_id}
                name={m.display}
              />
            }
          </div>

          {m.user_id===user.id&&
            ["OPEN","FULL"].includes(party.status)&&
            <ChangeCharacter
              partyId={id}
              currentCharacterId={m.character_id}
              characters={changeCharacters}
            />
          }
        </div>
      )}
    </div>
  </main>;
}

