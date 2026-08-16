import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";

type C={
  id:string;
  slug:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
  active:boolean;
  sort_order:number;
  character_count:number;
};

export default async function AdminClassesPage() {
  await requireAdmin();

  const classes=await query<C>(`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.abbreviation,
      c.damage_type,
      c.role,
      c.icon_path,
      c.active,
      c.sort_order,
      COUNT(ch.id)::int character_count
    FROM classes c
    LEFT JOIN characters ch ON ch.class_id=c.id
    GROUP BY c.id
    ORDER BY c.sort_order,c.name
  `);

  return <main>
    <div className="row between">
      <div>
        <div className="eyebrow">Administration</div>
        <h1>Classes</h1>
        <p className="muted">
          Classes control character selection and party-role matching.
        </p>
      </div>

      <Link className="btn primary" href="/admin/classes/new">
        + Add class
      </Link>
    </div>

    <div className="grid">
      {classes.rows.map(c=>
        <article className="card stack" key={c.id}>
          <div className="row between">
            <div className="row">
              <div className="classicon">{c.abbreviation}</div>
              <div>
                <div className="eyebrow">{c.slug}</div>
                <h2 style={{margin:0}}>{c.name}</h2>
              </div>
            </div>

            <span className={`pill ${c.active?"":"admin-inactive"}`}>
              {c.active?"ACTIVE":"INACTIVE"}
            </span>
          </div>

          <div className="row">
            <span className="pill">{c.damage_type}</span>
            <span className="pill">{c.role}</span>
            <span className="pill">
              {c.character_count} character
              {c.character_count===1?"":"s"}
            </span>
          </div>

          <div className="muted">
            Order {c.sort_order}
            {c.icon_path?` - Icon: ${c.icon_path}`:" - No icon configured"}
          </div>

          <Link className="btn" href={`/admin/classes/${c.id}`}>
            Manage class
          </Link>
        </article>
      )}

      {classes.rows.length===0&&
        <div className="card muted">No classes configured.</div>
      }
    </div>
  </main>;
}
