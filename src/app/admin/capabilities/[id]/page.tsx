import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import CapabilityAdminForm from "@/components/admin/CapabilityAdminForm";
import DeleteCapabilityButton from "@/components/admin/DeleteCapabilityButton";

type Capability={
  id:string;
  slug:string;
  name:string;
  description:string;
  category:"DAMAGE"|"GEAR"|"UTILITY"|"OTHER";
  raid_id:string|null;
  active:boolean;
  sort_order:number;
};

type Raid={
  id:string;
  name:string;
};

export default async function Page({
  params,
}:{
  params:Promise<{id:string}>;
}) {
  await requireAdmin();
  const {id}=await params;

  const [capability,raids,usage]=await Promise.all([
    query<Capability>(`
      SELECT
        id,slug,name,description,category,raid_id,active,sort_order
      FROM capability_tags
      WHERE id=$1
    `,[id]),
    query<Raid>(`
      SELECT id,name
      FROM raids
      ORDER BY sort_order,name
    `),
    query<{count:number}>(
      `SELECT COUNT(*)::int count
       FROM character_capabilities
       WHERE capability_tag_id=$1`,
      [id],
    ),
  ]);

  if(!capability.rowCount)notFound();
  const c=capability.rows[0];

  return <main>
    <div className="row between">
      <div>
        <div className="eyebrow">Capability</div>
        <h1>{c.name}</h1>
      </div>
      <Link className="btn" href="/admin/capabilities">
        Back to capabilities
      </Link>
    </div>

    <CapabilityAdminForm capability={c} raids={raids.rows}/>

    <section className="card stack admin-danger-zone">
      <div>
        <div className="eyebrow">Danger zone</div>
        <h2>Delete capability</h2>
        <p className="muted">
          {usage.rows[0].count===0
            ? "No characters currently use this capability."
            : `${usage.rows[0].count} character assignment(s) use this capability. Deactivate it instead.`}
        </p>
      </div>

      <DeleteCapabilityButton
        capabilityId={id}
        capabilityName={c.name}
      />
    </section>
  </main>;
}
