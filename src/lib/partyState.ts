import { PoolClient } from "pg";
import { query } from "@/lib/db";

export type PartyCapacity = {
  partySize: number;
  accepted: number;
  status: "OPEN" | "FULL" | "CANCELLED" | "DONE";
};

export async function getPartyCapacity(partyId: string): Promise<PartyCapacity | null> {
  const r = await query<{
    party_size: number;
    accepted: number;
    status: PartyCapacity["status"];
  }>(`
    SELECT
      r.party_size,
      COUNT(pm.user_id) FILTER (WHERE pm.status='ACCEPTED')::int AS accepted,
      p.status
    FROM parties p
    JOIN raids r ON r.id=p.raid_id
    LEFT JOIN party_members pm ON pm.party_id=p.id
    WHERE p.id=$1
    GROUP BY p.id,r.party_size,p.status
  `,[partyId]);

  if (!r.rowCount) return null;
  return {
    partySize: r.rows[0].party_size,
    accepted: r.rows[0].accepted,
    status: r.rows[0].status
  };
}

export async function syncPartyOpenFull(partyId: string, client?: PoolClient) {
  const runner = client ?? { query };
  const r = await runner.query<{
    party_size: number;
    accepted: number;
    status: PartyCapacity["status"];
  }>(`
    SELECT
      r.party_size,
      COUNT(pm.user_id) FILTER (WHERE pm.status='ACCEPTED')::int AS accepted,
      p.status
    FROM parties p
    JOIN raids r ON r.id=p.raid_id
    LEFT JOIN party_members pm ON pm.party_id=p.id
    WHERE p.id=$1
    GROUP BY p.id,r.party_size,p.status
  `,[partyId]);

  if (!r.rowCount) return null;

  const row=r.rows[0];
  if (row.status==="DONE" || row.status==="CANCELLED") return row;

  const next = row.accepted >= row.party_size ? "FULL" : "OPEN";
  if (next !== row.status) {
    await runner.query("UPDATE parties SET status=$2,updated_at=now() WHERE id=$1",[partyId,next]);
  }

  return {...row,status:next};
}

export async function partyHasSpace(partyId:string) {
  const c=await getPartyCapacity(partyId);
  return Boolean(c && (c.status==="OPEN" || c.status==="FULL") && c.accepted < c.partySize);
}
