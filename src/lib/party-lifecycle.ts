import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

// Safety-net expiry:
// - parties with an explicit end time expire 2 hours after it;
// - otherwise they expire 6 hours after their scheduled start.
//
// EXPIRED means the party aged out without an explicit Complete/Cancel action.
// DONE remains reserved for an explicit successful completion.
export async function cleanupPastActiveParties() {
  const client=await db.connect();

  try {
    await client.query("BEGIN");

    const expired=await client.query<{
      id:string;
      leader_id:string;
      start_time:Date;
      end_time:Date|null;
    }>(`
      UPDATE parties
      SET
        status='EXPIRED',
        expired_at=COALESCE(expired_at,now()),
        updated_at=now()
      WHERE status IN ('OPEN','FULL')
        AND (
          (
            end_time IS NOT NULL
            AND end_time < now() - interval '2 hours'
          )
          OR
          (
            end_time IS NULL
            AND start_time < now() - interval '6 hours'
          )
        )
      RETURNING id,leader_id,start_time,end_time
    `);

    for(const party of expired.rows) {
      await writeAudit({
        userId:null,
        action:"PARTY_AUTO_EXPIRE",
        entityType:"party",
        entityId:party.id,
        metadata:{
          leader_user_id:party.leader_id,
          start_time:party.start_time,
          end_time:party.end_time,
          reason:"Party passed automatic expiry window",
        },
      },client);
    }

    await client.query("COMMIT");
    return expired.rowCount??0;
  } catch(e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Backwards-compatible name used by existing Partyfinder pages.
 */
export async function archiveExpiredParties() {
  return cleanupPastActiveParties();
}
