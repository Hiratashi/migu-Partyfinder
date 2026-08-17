import Link from "next/link";
import AdminBackNav from "./AdminBackNav";

export default function AdminSectionToolbar({
  current,
  actionHref,
  actionLabel,
}:{
  current:"dashboard"|"users"|"raids"|"classes"|"parties"|"audit";
  actionHref?:string;
  actionLabel?:string;
}) {
  return <div className="admin-section-toolbar-unified">
    <AdminBackNav current={current}/>

    <div className="admin-section-toolbar-action">
      {actionHref&&actionLabel
        ? <Link className="btn primary" href={actionHref}>
            {actionLabel}
          </Link>
        : null
      }
    </div>
  </div>;
}
