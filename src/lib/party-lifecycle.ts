import { query } from "./db";

// Safety-net archive: parties with an explicit end time are completed 2h after it;
// otherwise they are completed 6h after their scheduled start.
export async function archiveExpiredParties() {
  await query(`UPDATE parties
    SET status='DONE', completed_at=COALESCE(completed_at, now()), updated_at=now()
    WHERE status IN ('OPEN','FULL')
      AND (
        (end_time IS NOT NULL AND end_time < now() - interval '2 hours')
        OR
        (end_time IS NULL AND start_time < now() - interval '6 hours')
      )`);
}
