import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import ClassAdminForm from "@/components/admin/ClassAdminForm";
import DeleteClassButton from "@/components/admin/DeleteClassButton";
import ClassIcon from "@/components/ClassIcon";

type C={
  id:string;
  slug:string;
  name:string;
  abbreviation:string;
  base_character:string;
  path_number:number;
  damage_type:"PHYSICAL"|"MAGICAL"|"HYBRID"|"NONE";
  role:"DPS"|"SUPPORT"|"FLEX";
  icon_path:string|null;
  active:boolean;
  sort_order:number;
};

export default async function Page({params}:{params:Promise<{id:string}>}) {
  await requireAdmin();
  const {id}=await params;

  const row=await query<C>(`
    SELECT
      id,slug,name,abbreviation,base_character,path_number,
      damage_type,role,icon_path,active,sort_order
    FROM classes WHERE id=$1
  `,[id]);
  if(!row.rowCount)notFound();
  const c=row.rows[0];

  const count=await query<{count:number}>(
    "SELECT COUNT(*)::int count FROM characters WHERE class_id=$1",[id]
  );

  return <main>
    <div className="row between">
      <div className="row">
        <ClassIcon src={c.icon_path} abbreviation={c.abbreviation} name={c.name} size="large"/>
        <div>
          <div className="eyebrow">{c.base_character} - Path {c.path_number}</div>
          <h1>{c.name}</h1>
        </div>
      </div>
      <Link className="btn" href="/admin/classes">Back to classes</Link>
    </div>

    <ClassAdminForm classRow={c}/>

    <section className="card stack admin-danger-zone">
      <div>
        <div className="eyebrow">Danger zone</div>
        <h2>Delete class</h2>
        <p className="muted">
          {count.rows[0].count===0
            ? "No characters currently use this class."
            : `${count.rows[0].count} character(s) use this class. Deactivate it instead.`}
        </p>
      </div>
      <DeleteClassButton classId={id} className={c.name}/>
    </section>
  </main>;
}
