import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";

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
  encounter_count:number;
};

export default async function AdminRaidsPage() {
  await requireAdmin();

  const raids=await query<Raid>(`
    SELECT
      r.id,
      r.slug,
      r.name,
      r.party_size,
      r.supported_stages,
      r.default_stage,
      r.practice_supported,
      r.active,
      r.sort_order,
      COUNT(e.id)::int encounter_count
    FROM raids r
    LEFT JOIN encounters e ON e.raid_id=r.id
    GROUP BY r.id
    ORDER BY r.sort_order,r.name
  `);

  return <main>
    <div className="row between">
      <div>
        <div className="eyebrow">Administration</div>
        <h1>Raids</h1>
        <p className="muted">
          Configure the raids used by party creation and availability.
        </p>
      </div>
      <Link className="btn primary" href="/admin/raids/new">
        + Add raid
      </Link>
    </div>

    <div className="grid">
      {raids.rows.map(raid=>
        <article className="card stack" key={raid.id}>
          <div className="row between">
            <div>
              <div className="eyebrow">{raid.slug}</div>
              <h2 style={{marginBottom:0}}>{raid.name}</h2>
            </div>
            <span className={`pill ${raid.active?"":"admin-inactive"}`}>
              {raid.active?"ACTIVE":"INACTIVE"}
            </span>
          </div>

          <div className="row">
            <span className="pill">{raid.party_size} players</span>
            <span className="pill">{raid.encounter_count} fights</span>
            <span className="pill">
              Stages {raid.supported_stages.map(Number).join(", ")}
            </span>
          </div>

          <div className="muted">
            Default Stage {raid.default_stage} - Order {raid.sort_order}  - {" "}
            {raid.practice_supported?"Practice enabled":"No practice groups"}
          </div>

          <Link className="btn" href={`/admin/raids/${raid.id}`}>
            Manage raid
          </Link>
        </article>
      )}
    </div>
  </main>;
}
