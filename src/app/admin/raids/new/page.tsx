import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import RaidAdminForm from "@/components/admin/RaidAdminForm";

export default async function NewRaidAdminPage() {
  await requireAdmin();

  return <main>
    <div className="eyebrow">Administration</div>
    <h1>Add raid</h1>
    <p className="muted">
      Create the raid first, then add its encounters.
    </p>

    <RaidAdminForm/>

    <div style={{marginTop:16}}>
      <Link className="btn" href="/admin/raids">Back to raids</Link>
    </div>
  </main>;
}
