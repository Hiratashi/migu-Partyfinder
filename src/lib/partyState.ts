import type { PoolClient } from "pg";
import { query } from "@/lib/db";

export type PartyStatus = "OPEN" | "FULL" | "CANCELLED" | "DONE" | "EXPIRED";

export type PartyCapacity = {
  partySize: number;
  accepted: number;
  status: PartyStatus;
};

type CapacityRow = {
  party_size: number;
  accepted: number;
  status: PartyStatus;
};

const capacitySql = `
  SELECT
    r.party_size,
    COUNT(pm.user_id) FILTER (WHERE pm.status='ACCEPTED')::int AS accepted,
    p.status
  FROM parties p
  JOIN raids r ON r.id=p.raid_id
  LEFT JOIN party_members pm ON pm.party_id=p.id
  WHERE p.id=$1
  GROUP BY p.id,r.party_size,p.status
`;

function mapCapacity(row: CapacityRow): PartyCapacity {
  return {
    partySize: row.party_size,
    accepted: row.accepted,
    status: row.status,
  };
}

export async function getPartyCapacity(
  partyId: string,
  client?: PoolClient,
): Promise<PartyCapacity | null> {
  const result = client
    ? await client.query<CapacityRow>(capacitySql, [partyId])
    : await query<CapacityRow>(capacitySql, [partyId]);

  if (!result.rowCount) return null;
  return mapCapacity(result.rows[0]);
}

export async function syncPartyOpenFull(
  partyId: string,
  client?: PoolClient,
): Promise<PartyCapacity | null> {
  const current = await getPartyCapacity(partyId, client);
  if (!current) return null;

  if (current.status === "DONE" || current.status === "CANCELLED" || current.status === "EXPIRED") {
    return current;
  }

  const next: PartyStatus =
    current.accepted >= current.partySize ? "FULL" : "OPEN";

  if (next !== current.status) {
    if (client) {
      await client.query(
        "UPDATE parties SET status=$2,updated_at=now() WHERE id=$1",
        [partyId, next],
      );
    } else {
      await query(
        "UPDATE parties SET status=$2,updated_at=now() WHERE id=$1",
        [partyId, next],
      );
    }
  }

  return { ...current, status: next };
}

export async function partyHasSpace(
  partyId: string,
  client?: PoolClient,
): Promise<boolean> {
  const capacity = await getPartyCapacity(partyId, client);
  return Boolean(
    capacity &&
      (capacity.status === "OPEN" || capacity.status === "FULL") &&
      capacity.accepted < capacity.partySize,
  );
}
