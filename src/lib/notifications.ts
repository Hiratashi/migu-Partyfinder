import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";

type Kind="PARTY_INVITATION"|"PARTY_CHANGED"|"PARTY_CLOSED"|"PARTY_REMOVED"|
  "PARTY_JOINED"|"PARTY_LEFT"|"PARTY_FULL";

export async function notifyLeaderOfJoin(client:PoolClient,{
  partyId,leaderId,memberName,becameFull,
}: {
  partyId:string;
  leaderId:string;
  memberName:string;
  becameFull:boolean;
}) {
  await notifyUsers(client,{
    partyId,recipients:[leaderId],kind:"PARTY_JOINED",title:"Player joined your party",
    body:`${memberName} joined your party.`,
  });
  if(becameFull) {
    await notifyUsers(client,{
      partyId,recipients:[leaderId],kind:"PARTY_FULL",title:"Your party is full",
      body:"All places in your party are now occupied.",
    });
  }
}

export async function notifyLeaderOfLeave(client:PoolClient,{
  partyId,leaderId,memberName,declinedChange=false,
}: {
  partyId:string;
  leaderId:string;
  memberName:string;
  declinedChange?:boolean;
}) {
  await notifyUsers(client,{
    partyId,recipients:[leaderId],kind:"PARTY_LEFT",title:"Player left your party",
    body:declinedChange
      ? `${memberName} declined the changed party details and left.`
      : `${memberName} left your party.`,
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
