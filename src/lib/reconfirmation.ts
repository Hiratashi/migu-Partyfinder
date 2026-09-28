import type { NotificationChange } from "@/lib/notifications";
import type { PoolClient } from "pg";

// Keep the first value a member agreed to and the latest proposed value.
// If a leader restores that original value, the field no longer needs consent.
export function mergeReconfirmationChanges(
  pending:NotificationChange[],
  latest:NotificationChange[],
):NotificationChange[] {
  const changes=new Map(pending.map(change=>[change.label,change]));
  for(const change of latest) {
    const original=changes.get(change.label);
    changes.set(change.label,{
      ...change,
      before:original?.before??change.before,
    });
  }
  return [...changes.values()].filter(change=>change.before!==change.after);
}

export async function requestReconfirmation(
  client:PoolClient,
  partyId:string,
  leaderId:string,
  changes:NotificationChange[],
) {
  const members=await client.query<{user_id:string;status:string}>(`
    SELECT user_id,status FROM party_members
    WHERE party_id=$1 AND user_id<>$2 AND status IN ('ACCEPTED','INVITED')
  `,[partyId,leaderId]);
  const material=changes.filter(change=>change.label!=="Title");
  if(material.length) {
    for(const member of members.rows) {
      if(member.status!=="ACCEPTED")continue;
      const pending=await client.query<{change_details:NotificationChange[]}>(`
        SELECT change_details FROM party_reconfirmations
        WHERE party_id=$1 AND user_id=$2
      `,[partyId,member.user_id]);
      const merged=mergeReconfirmationChanges(pending.rows[0]?.change_details??[],material);
      if(merged.length) {
        await client.query(`
          INSERT INTO party_reconfirmations(party_id,user_id,change_details)
          VALUES($1,$2,$3::jsonb)
          ON CONFLICT(party_id,user_id) DO UPDATE SET
            change_details=EXCLUDED.change_details,
            revision=gen_random_uuid(),
            updated_at=now()
        `,[partyId,member.user_id,JSON.stringify(merged)]);
      } else {
        await client.query("DELETE FROM party_reconfirmations WHERE party_id=$1 AND user_id=$2",[partyId,member.user_id]);
      }
    }
  }
  return members.rows.map(member=>member.user_id);
}
