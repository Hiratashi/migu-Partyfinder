import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import ClassAdminForm from "@/components/admin/ClassAdminForm";
import DeleteClassButton from "@/components/admin/DeleteClassButton";

type C={
  id:string;
  slug:string;
  name:string;
  abbreviation:string;
  damage_type:"PHYSICAL"|"MAGICAL"|"HYBRID"|"NONE";
  role:"DPS"|"SUPPORT"|"FLEX";
  icon_path:string|null;
  active:boolean;
  sort_order:number;
};

export default async function ClassAdminDetail({
  params,
}:{
  params:Promise<{id:string}>;
}) {
  await requireAdmin();
  const {id}=await params;

  const row=await query<C>(`
    SELECT
      id,slug,name,abbreviation,damage_type,role,
      icon_path,active,sort_order
    FROM classes
    WHERE id=$1
  `,[id]);

  if(!row.rowCount)notFound();
  const current=row.rows[0];

  const characterCount=await query<{count:number}>(`
    SELECT COUNT(*)::int count
    FROM characters
    WHERE class_id=$1
  `,[id]);

  return <main>
    <div className="row between">
      <div>
        <div className="eyebrow">Administration</div>
        <h1>{current.name}</h1>
      </div>
      <Link className="btn" href="/admin/classes">
        Back to classes
      </Link>
    </div>

    <ClassAdminForm classRow={current}/>

    <section className="card stack admin-danger-zone">
      <div>
        <div className="eyebrow">Danger zone</div>
        <h2>Delete class</h2>
        <p className="muted">
          {characterCount.rows[0].count===0
            ? "No characters currently use this class, so it can be permanently removed."
            : `${characterCount.rows[0].count} character${
                characterCount.rows[0].count===1?" uses":"s use"
              } this class. Deactivate it instead if it should no longer be selectable.`}
        </p>
      </div>

      <DeleteClassButton
        classId={id}
        className={current.name}
      />
    </section>
  </main>;
}
