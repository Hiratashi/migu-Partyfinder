import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import ClassAdminForm from "@/components/admin/ClassAdminForm";

export default async function NewClassAdminPage() {
  await requireAdmin();

  return <main>
    <div className="eyebrow">Administration</div>
    <h1>Add class</h1>
    <p className="muted">
      New active classes become immediately available when users add a
      character.
    </p>

    <ClassAdminForm/>

    <div style={{marginTop:16}}>
      <Link className="btn" href="/admin/classes">
        Back to classes
      </Link>
    </div>
  </main>;
}
