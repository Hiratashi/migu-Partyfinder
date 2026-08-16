import { query } from "@/lib/db";

export type RaidConfig = {
  id:string;
  slug:string;
  name:string;
  party_size:number;
  supported_stages:number[];
  default_stage:number;
  practice_supported:boolean;
  active:boolean;
};

export type RaidEncounter = {
  id:string;
  code:string;
  name:string;
  sort_order:number;
};

function normalizeRaid(row:any):RaidConfig {
  return {
    ...row,
    party_size:Number(row.party_size),
    supported_stages:(row.supported_stages??[]).map(Number),
    default_stage:Number(row.default_stage),
    practice_supported:Boolean(row.practice_supported),
    active:Boolean(row.active),
  };
}

export async function getActiveRaids():Promise<RaidConfig[]> {
  const r=await query<any>(`
    SELECT
      id,slug,name,party_size,supported_stages,default_stage,
      practice_supported,active
    FROM raids
    WHERE active=true
    ORDER BY name
  `);
  return r.rows.map(normalizeRaid);
}

export async function getRaidBySlug(
  slug:string,
  activeOnly=true,
):Promise<RaidConfig|null> {
  const r=await query<any>(`
    SELECT
      id,slug,name,party_size,supported_stages,default_stage,
      practice_supported,active
    FROM raids
    WHERE slug=$1
      ${activeOnly?"AND active=true":""}
    LIMIT 1
  `,[slug]);

  return r.rowCount ? normalizeRaid(r.rows[0]) : null;
}

export async function getRaidById(
  id:string,
):Promise<RaidConfig|null> {
  const r=await query<any>(`
    SELECT
      id,slug,name,party_size,supported_stages,default_stage,
      practice_supported,active
    FROM raids
    WHERE id=$1
    LIMIT 1
  `,[id]);

  return r.rowCount ? normalizeRaid(r.rows[0]) : null;
}

export async function getRaidEncounters(
  raidId:string,
):Promise<RaidEncounter[]> {
  const r=await query<RaidEncounter>(`
    SELECT id,code,name,sort_order
    FROM encounters
    WHERE raid_id=$1
    ORDER BY sort_order
  `,[raidId]);
  return r.rows;
}

export function raidSupportsStage(
  raid:RaidConfig,
  stage:number,
) {
  return raid.supported_stages.includes(stage);
}
