import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";

type Kind="PARTY_INVITATION"|"PARTY_CHANGED";

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
