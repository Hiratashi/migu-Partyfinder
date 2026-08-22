import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import AdminSectionToolbar from "@/components/admin/AdminSectionToolbar";

type Capability={
  id:string;
  slug:string;
  name:string;
  description:string;
  category:"DAMAGE"|"GEAR"|"UTILITY"|"OTHER";
  raid_id:string|null;
  raid_name:string|null;
  active:boolean;
  sort_order:number;
  character_count:number;
};

const categoryLabel={
  DAMAGE:"Damage",
  GEAR:"Gear",
  UTILITY:"Utility",
  OTHER:"Other",
} as const;

export default async function AdminCapabilitiesPage() {
  await requireAdmin();

  const capabilities=await query<Capability>(`
    SELECT
      ct.id,
      ct.slug,
      ct.name,
      ct.description,
      ct.category,
      ct.raid_id,
      r.name raid_name,
      ct.active,
      ct.sort_order,
      COUNT(cc.character_id)::int character_count
    FROM capability_tags ct
    LEFT JOIN raids r ON r.id=ct.raid_id
    LEFT JOIN character_capabilities cc
      ON cc.capability_tag_id=ct.id
    GROUP BY ct.id,r.name
    ORDER BY ct.sort_order,ct.name
  `);

  return <main className="admin-page">
    <div>
      <div className="eyebrow">Administration</div>
      <h1>Capabilities</h1>
      <p className="muted">
        Configure the character capabilities players can select.
        Capabilities may be global or limited to one raid.
      </p>
    </div>

    <AdminSectionToolbar
      current="capabilities"
      actionHref="/admin/capabilities/new"
      actionLabel="+ Add capability"
    />

    <div className="grid">
      {capabilities.rows.map(capability=>
        <article className="card stack" key={capability.id}>
          <div className="row between">
            <div>
              <div className="eyebrow">{capability.slug}</div>
              <h2 style={{marginBottom:0}}>{capability.name}</h2>
            </div>
            <span
              className={`pill ${capability.active?"":"admin-inactive"}`}
            >
              {capability.active?"ACTIVE":"INACTIVE"}
            </span>
          </div>

          <div className="row">
            <span className="pill">
              {categoryLabel[capability.category]}
            </span>
            <span className="pill">
              {capability.raid_name??"Global"}
            </span>
            <span className="pill">
              {capability.character_count} assigned
            </span>
          </div>

          {capability.description&&
            <p className="muted" style={{margin:0}}>
              {capability.description}
            </p>
          }

          <div className="muted">
            Display order {capability.sort_order}
          </div>

          <Link
            className="btn"
            href={`/admin/capabilities/${capability.id}`}
          >
            Manage capability
          </Link>
        </article>
      )}

      {capabilities.rows.length===0&&
        <article className="card stack">
          <strong>No capabilities configured yet.</strong>
          <span className="muted">
            Create the first capability to start building the catalogue.
          </span>
        </article>
      }
    </div>
  </main>;
}
