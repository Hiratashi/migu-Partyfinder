import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import ClassIcon from "@/components/ClassIcon";
import AdminSectionToolbar from "@/components/admin/AdminSectionToolbar";

type C={
  id:string;
  slug:string;
  name:string;
  abbreviation:string;
  base_character:string;
  path_number:number;
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
      c.id,c.slug,c.name,c.abbreviation,c.base_character,c.path_number,
      c.damage_type,c.role,c.icon_path,c.active,c.sort_order,
      COUNT(ch.id)::int character_count
    FROM classes c
    LEFT JOIN characters ch ON ch.class_id=c.id
    GROUP BY c.id
    ORDER BY c.sort_order,c.name
  `);

  const groups=new Map<string,C[]>();
  for(const c of classes.rows) {
    const key=c.base_character||"Other";
    groups.set(key,[...(groups.get(key)??[]),c]);
  }

  return <main className="admin-page">
    <div>
        <div className="eyebrow">Administration</div>
        <h1>Classes</h1>
        <p className="muted">
          {classes.rowCount} final classes configured. Roles are Partyfinder
          defaults and can be adjusted when balance/meta changes.
        </p>
      </div>

    <AdminSectionToolbar current="classes" actionHref="/admin/classes/new" actionLabel="+ Add class"/>

    {[...groups.entries()].map(([base,items])=>
      <section key={base} className="class-admin-group">
        <h2>{base}</h2>
        <div className="grid class-catalogue-grid">
          {items.map(c=>
            <article className="card stack" key={c.id}>
              <div className="row between">
                <div className="row">
                  <ClassIcon
                    src={c.icon_path}
                    abbreviation={c.abbreviation}
                    name={c.name}
                    size="large"
                  />
                  <div>
                    <div className="eyebrow">Path {c.path_number}</div>
                    <h3 style={{margin:0}}>{c.name}</h3>
                    <span className="muted">{c.abbreviation}</span>
                  </div>
                </div>
                <span className={`pill ${c.active?"":"admin-inactive"}`}>
                  {c.active?"ACTIVE":"INACTIVE"}
                </span>
              </div>

              <div className="row">
                <span className="pill">{c.damage_type}</span>
                <span className="pill">{c.role}</span>
                <span className="pill">{c.character_count} used</span>
              </div>

              <Link className="btn" href={`/admin/classes/${c.id}`}>
                Manage class
              </Link>
            </article>
          )}
        </div>
      </section>
    )}
  </main>;
}
