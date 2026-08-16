import { query } from "@/lib/db";

// Safety-net expiry:
// - parties with an explicit end time expire 2 hours after it;
// - otherwise they expire 6 hours after their scheduled start.
//
// EXPIRED means the party aged out without an explicit Complete/Cancel action.
// DONE remains reserved for an explicit successful completion.
export async function cleanupPastActiveParties() {
  const expired=await query<{id:string}>(`
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
    RETURNING id
  `);

  return expired.rowCount??0;
}

/**
 * Backwards-compatible name used by existing Partyfinder pages.
 */
export async function archiveExpiredParties() {
  return cleanupPastActiveParties();
}
