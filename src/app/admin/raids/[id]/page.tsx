import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import RaidAdminForm from "@/components/admin/RaidAdminForm";
import EncounterAdmin from "@/components/admin/EncounterAdmin";
import DeleteRaidButton from "@/components/admin/DeleteRaidButton";

type Raid={
  id:string;
  slug:string;
  name:string;
  party_size:number;
  supported_stages:number[];
  default_stage:number;
  practice_supported:boolean;
  active:boolean;
  sort_order:number;
};

type Encounter={
  id:string;
  code:string;
  name:string;
  sort_order:number;
};

export default async function RaidAdminDetail({
  params,
}:{
  params:Promise<{id:string}>;
}) {
  await requireAdmin();
  const {id}=await params;

  const raid=await query<Raid>(`
    SELECT
      id,slug,name,party_size,supported_stages,default_stage,
      practice_supported,active,sort_order
    FROM raids
    WHERE id=$1
  `,[id]);

  if(!raid.rowCount)notFound();

  const encounters=await query<Encounter>(`
    SELECT id,code,name,sort_order
    FROM encounters
    WHERE raid_id=$1
    ORDER BY sort_order,code
  `,[id]);

  const current=raid.rows[0];

  return <main>
    <div className="row between">
      <div>
        <div className="eyebrow">Administration</div>
        <h1>{current.name}</h1>
      </div>
      <Link className="btn" href="/admin/raids">Back to raids</Link>
    </div>

    <h2>Raid settings</h2>
    <RaidAdminForm raid={current}/>

    <h2 className="section-title">Encounters</h2>
    <p className="muted">
      Codes are what users see in Run selections. Names remain available
      for descriptive UI later.
    </p>

    <EncounterAdmin raidId={id} encounters={encounters.rows}/>

    <section className="card stack admin-danger-zone">
      <div>
        <div className="eyebrow">Danger zone</div>
        <h2>Delete raid</h2>
        <p className="muted">
          Use this only for unused test or mistake raids. If the raid has
          party history or saved availability, deactivate it instead.
        </p>
      </div>

      <DeleteRaidButton raidId={id} raidName={current.name}/>
    </section>
  </main>;
}
