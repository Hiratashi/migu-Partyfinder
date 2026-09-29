import { query } from "@/lib/db";

const intervalMs=60*60*1000;
let lastRun=0;
let inFlight:Promise<void>|null=null;

/** Delete expired inbox entries (and their cascaded Discord outbox records).
 * Runs at most once per process per hour when an authenticated request arrives.
 */
export async function pruneExpiredNotifications() {
  if(inFlight)return inFlight;
  if(Date.now()-lastRun<intervalMs)return;
  inFlight=(async()=>{
    try {
      await query("DELETE FROM notifications WHERE created_at<now()-interval '30 days'");
      lastRun=Date.now();
    } catch(error) {
      console.error("Notification retention cleanup failed",error);
    } finally {
      inFlight=null;
    }
  })();
  return inFlight;
}
