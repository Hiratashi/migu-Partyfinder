import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";

async function rosterSummary(client:PoolClient,partyId:string) {
  const result=await client.query<{
    party_size:number;need_dps:number;need_support:number;
    accepted:number;dps:number;support:number;
  }>(`
    SELECT r.party_size,p.need_dps,p.need_support,
      COUNT(pm.user_id)::int AS accepted,
      COUNT(pm.user_id) FILTER (WHERE c.role='DPS')::int AS dps,
      COUNT(pm.user_id) FILTER (WHERE c.role='SUPPORT')::int AS support
    FROM parties p JOIN raids r ON r.id=p.raid_id
    LEFT JOIN party_members pm ON pm.party_id=p.id AND pm.status='ACCEPTED'
    LEFT JOIN characters ch ON ch.id=pm.character_id
    LEFT JOIN classes c ON c.id=ch.class_id
    WHERE p.id=$1
    GROUP BY r.party_size,p.need_dps,p.need_support
  `,[partyId]);
  const row=result.rows[0];
  if(!row)return "";
  const open=Math.max(0,row.party_size-row.accepted);
  const wanted=[
    Math.max(0,row.need_dps-row.dps)>0?`${Math.max(0,row.need_dps-row.dps)} DPS`:null,
    Math.max(0,row.need_support-row.support)>0?`${Math.max(0,row.need_support-row.support)} support`:null,
  ].filter(Boolean).join(", ");
  return `${row.accepted}/${row.party_size} filled; ${open} open.${wanted?` Looking for ${wanted}.`:""}`;
}

type Kind="PARTY_INVITATION"|"PARTY_CHANGED"|"PARTY_CLOSED"|"PARTY_REMOVED"|
  "PARTY_JOINED"|"PARTY_LEFT"|"PARTY_FULL"|"PARTY_CHARACTER_CHANGED"|
  "PARTY_GROUP_CHANGED"|"PARTY_REMINDER"|"PARTY_INCOMPLETE_REMINDER";

export async function notifyLeaderOfCharacterChange(client:PoolClient,{
  partyId,leaderId,memberName,before,after,
}: {
  partyId:string;
  leaderId:string;
  memberName:string;
  before:string;
  after:string;
}) {
  await notifyUsers(client,{
    partyId,recipients:[leaderId],kind:"PARTY_CHARACTER_CHANGED",
    title:"Player changed character",
    body:`${memberName} changed from ${before} to ${after}.`,
  });
}

export async function notifyLeaderOfJoin(client:PoolClient,{
  partyId,leaderId,memberName,character,becameFull,
}: {
  partyId:string;
  leaderId:string;
  memberName:string;
  character:string;
  becameFull:boolean;
}) {
  await notifyUsers(client,{
    partyId,recipients:[leaderId],kind:"PARTY_JOINED",title:"Player joined your party",
    body:`${memberName} joined your party with ${character}. ${await rosterSummary(client,partyId)}`,
  });
  if(becameFull) {
    await notifyUsers(client,{
      partyId,recipients:[leaderId],kind:"PARTY_FULL",title:"Your party is full",
      body:"All places in your party are now occupied.",
    });
  }
}

export async function notifyLeaderOfLeave(client:PoolClient,{
  partyId,leaderId,memberName,character,role,declinedChange=false,
}: {
  partyId:string;
  leaderId:string;
  memberName:string;
  character?:string;
  role?:string;
  declinedChange?:boolean;
}) {
  await notifyUsers(client,{
    partyId,recipients:[leaderId],kind:"PARTY_LEFT",title:"Player left your party",
    body:`${memberName}${declinedChange?" declined the changed party details and":""} left your party.${character?` They were playing ${character}${role?` (${role})`:""}.`:""} ${await rosterSummary(client,partyId)}`,
  });
}

export async function resolvePartyNotifications(client:PoolClient,partyId:string,recipients?:string[]) {
  await client.query(`
    UPDATE notifications SET read_at=COALESCE(read_at,now())
    WHERE party_id=$1 AND kind IN ('PARTY_INVITATION','PARTY_CHANGED')
      AND ($2::uuid[] IS NULL OR user_id=ANY($2::uuid[]))
  `,[partyId,recipients??null]);
}

export type NotificationChange={
  label:string;
  before:string;
  after:string;
  format?:"datetime";
};

export async function notifyUsers(client:PoolClient,{
  partyId,recipients,kind,title,body,changeDetails=[],
}: {
  partyId:string;
  recipients:string[];
  kind:Kind;
  title:string;
  body:string;
  changeDetails?:NotificationChange[];
}) {
  if(!recipients.length)return;
  // One event ID per action, with a unique recipient constraint for retry-safe delivery.
  await client.query(`
    INSERT INTO notifications(event_id,user_id,kind,title,body,party_id,change_details)
    SELECT $5,recipient.id,$1,$2,$3,$4,$7::jsonb
    FROM unnest($6::uuid[]) AS recipient(id)
    JOIN users u ON u.id=recipient.id AND u.access_disabled=false
    ON CONFLICT(event_id,user_id) DO NOTHING
  `,[kind,title,body,partyId,randomUUID(),[...new Set(recipients)],JSON.stringify(changeDetails)]);
}
