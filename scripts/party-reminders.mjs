// Polling from the long-running worker makes reminders independent of page visits.
// A short catch-up window avoids sending old reminders after an extended outage.
export async function queuePartyReminders(pool) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const result=await client.query(`
      WITH roster AS (
        SELECT p.id,p.leader_id,p.start_time,p.leader_incomplete_reminder_minutes,p.title,r.name AS raid_name,
               r.party_size,COUNT(pm.user_id)::int AS accepted
        FROM parties p
        JOIN raids r ON r.id=p.raid_id
        LEFT JOIN party_members pm ON pm.party_id=p.id AND pm.status='ACCEPTED'
        WHERE p.status IN ('OPEN','FULL') AND p.start_time>now()
        GROUP BY p.id,r.id
      ), eligible AS (
        SELECT roster.*,u.id AS recipient_id,
               CASE WHEN roster.accepted>=roster.party_size THEN u.party_reminder_minutes
                    ELSE roster.leader_incomplete_reminder_minutes END AS reminder_minutes,
               CASE WHEN roster.accepted>=roster.party_size THEN 'PARTY_REMINDER'
                    ELSE 'PARTY_INCOMPLETE_REMINDER' END AS reminder_kind
        FROM roster
        JOIN party_members pm ON pm.party_id=roster.id AND pm.status='ACCEPTED'
        JOIN users u ON u.id=pm.user_id AND u.access_disabled=false
        WHERE (CASE WHEN roster.accepted>=roster.party_size THEN u.party_reminder_minutes
                    ELSE roster.leader_incomplete_reminder_minutes END) IS NOT NULL
          AND (roster.accepted>=roster.party_size OR u.id=roster.leader_id)
          AND now()>=roster.start_time-(CASE WHEN roster.accepted>=roster.party_size THEN u.party_reminder_minutes
                    ELSE roster.leader_incomplete_reminder_minutes END)*interval '1 minute'
          AND now()<roster.start_time-(CASE WHEN roster.accepted>=roster.party_size THEN u.party_reminder_minutes
                    ELSE roster.leader_incomplete_reminder_minutes END)*interval '1 minute'+interval '10 minutes'
      ), claimed AS (
        INSERT INTO party_reminder_deliveries(party_id,user_id,start_time,kind)
        SELECT id,recipient_id,start_time,reminder_kind FROM eligible
        ON CONFLICT DO NOTHING
        RETURNING party_id,user_id,start_time,kind
      )
      INSERT INTO notifications(event_id,user_id,kind,title,body,party_id)
      SELECT gen_random_uuid(),c.user_id,c.kind,
             CASE WHEN e.accepted>=e.party_size THEN 'Your party starts soon'
                  ELSE 'Your party still has open places' END,
             CASE WHEN e.accepted>=e.party_size THEN 'Your raid is coming up. Check the party details.'
                  ELSE 'Your raid is coming up with '||(e.party_size-e.accepted)||
                    ' open place(s). Review the party and adjust or close it if needed.' END,
             c.party_id
      FROM claimed c JOIN eligible e ON e.id=c.party_id AND e.recipient_id=c.user_id AND e.reminder_kind=c.kind
      RETURNING id
    `);
    await client.query('COMMIT');
    return result.rowCount??0;
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {client.release();}
}
