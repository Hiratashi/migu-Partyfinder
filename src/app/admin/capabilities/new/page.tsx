import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import CapabilityAdminForm from "@/components/admin/CapabilityAdminForm";

type Raid={
  id:string;
  name:string;
};

export default async function NewCapabilityAdminPage() {
  await requireAdmin();

  const raids=await query<Raid>(`
    SELECT id,name
    FROM raids
    ORDER BY sort_order,name
  `);

  return <main>
    <div className="eyebrow">Administration</div>
    <h1>Add capability</h1>
    <p className="muted">
      Create a global capability or limit it to one specific raid.
    </p>

    <CapabilityAdminForm raids={raids.rows}/>

    <div style={{marginTop:16}}>
      <Link className="btn" href="/admin/capabilities">
        Back to capabilities
      </Link>
    </div>
  </main>;
}
