import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import AdminSectionToolbar from "@/components/admin/AdminSectionToolbar";

type Counts={
  users:number;
  enabled_users:number;
  disabled_users:number;
  admins:number;
  raids:number;
  active_raids:number;
  classes:number;
  active_classes:number;
  capabilities:number;
  active_capabilities:number;
  active_parties:number;
  open_parties:number;
  full_parties:number;
  audit_24h:number;
};

type RecentAudit={
  id:string;
  action:string;
  created_at:Date;
  username:string|null;
  display_name:string|null;
};

function actionLabel(action:string) {
  return action
    .replace(/^ADMIN_/,"")
    .replaceAll("_"," ")
    .toLowerCase()
    .replace(/\b\w/g,c=>c.toUpperCase());
}

function timeText(value:Date) {
  return new Intl.DateTimeFormat("en-GB",{
    dateStyle:"medium",
    timeStyle:"short",
    timeZone:"UTC",
  }).format(new Date(value))+" UTC";
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const counts=await query<Counts>(`
    SELECT
      (SELECT COUNT(*)::int FROM users) users,
      (
        SELECT COUNT(*)::int
        FROM users
        WHERE access_disabled=false
      ) enabled_users,
      (
        SELECT COUNT(*)::int
        FROM users
        WHERE access_disabled=true
      ) disabled_users,
      (
        SELECT COUNT(*)::int
        FROM users
        WHERE is_admin=true
          AND access_disabled=false
      ) admins,
      (SELECT COUNT(*)::int FROM raids) raids,
      (
        SELECT COUNT(*)::int
        FROM raids
        WHERE active=true
      ) active_raids,
      (SELECT COUNT(*)::int FROM classes) classes,
      (
        SELECT COUNT(*)::int
        FROM classes
        WHERE active=true
      ) active_classes,
      (SELECT COUNT(*)::int FROM capability_tags) capabilities,
      (
        SELECT COUNT(*)::int
        FROM capability_tags
        WHERE active=true
      ) active_capabilities,
      (
        SELECT COUNT(*)::int
        FROM parties
        WHERE status IN ('OPEN','FULL')
      ) active_parties,
      (
        SELECT COUNT(*)::int
        FROM parties
        WHERE status='OPEN'
      ) open_parties,
      (
        SELECT COUNT(*)::int
        FROM parties
        WHERE status='FULL'
      ) full_parties,
      (
        SELECT COUNT(*)::int
        FROM audit_log
        WHERE created_at>=now()-interval '24 hours'
      ) audit_24h
  `);

  const recent=await query<RecentAudit>(`
    SELECT
      a.id,
      a.action,
      a.created_at,
      u.username,
      u.display_name
    FROM audit_log a
    LEFT JOIN users u ON u.id=a.user_id
    ORDER BY a.created_at DESC
    LIMIT 6
  `);

  const c=counts.rows[0];

  return <main className="admin-page">
    <div>
      <div className="eyebrow">Administration</div>
      <h1>Dashboard</h1>
      <p className="muted">
        Manage Partyfinder and review recent administrative activity.
      </p>
    </div>

    <AdminSectionToolbar current="dashboard"/>

    <section className="admin-dashboard-stats">
      <Link className="card admin-dashboard-stat" href="/admin/users">
        <span className="muted">Users</span>
        <strong>{c.users}</strong>
        <small>
          {c.enabled_users} enabled - {c.disabled_users} disabled - {c.admins} admins
        </small>
      </Link>

      <Link className="card admin-dashboard-stat" href="/admin/raids">
        <span className="muted">Raids</span>
        <strong>{c.active_raids}</strong>
        <small>{c.active_raids} active - {c.raids} total</small>
      </Link>

      <Link className="card admin-dashboard-stat" href="/admin/classes">
        <span className="muted">Classes</span>
        <strong>{c.active_classes}</strong>
        <small>{c.active_classes} active - {c.classes} total</small>
      </Link>

      <Link className="card admin-dashboard-stat" href="/admin/capabilities">
        <span className="muted">Capabilities</span>
        <strong>{c.active_capabilities}</strong>
        <small>{c.active_capabilities} active - {c.capabilities} total</small>
      </Link>

      <Link className="card admin-dashboard-stat" href="/admin/parties">
        <span className="muted">Active parties</span>
        <strong>{c.active_parties}</strong>
        <small>{c.open_parties} open - {c.full_parties} full</small>
      </Link>

      <Link className="card admin-dashboard-stat" href="/admin/audit">
        <span className="muted">Audit events</span>
        <strong>{c.audit_24h}</strong>
        <small>during the last 24 hours</small>
      </Link>
    </section>

    <section className="card admin-dashboard-recent">
      <div className="admin-card-heading">
        <div>
          <h2>Recent activity</h2>
          <p className="muted">
            Latest events written to the Partyfinder audit log.
          </p>
        </div>

        <Link className="btn" href="/admin/audit">
          View audit log
        </Link>
      </div>

      <div className="admin-dashboard-activity">
        {recent.rows.map(row=>
          <div className="admin-dashboard-activity-row" key={row.id}>
            <div>
              <strong>{actionLabel(row.action)}</strong>
              <span className="muted">
                {row.display_name??row.username??"System / unknown user"}
              </span>
            </div>
            <time>{timeText(row.created_at)}</time>
          </div>
        )}

        {recent.rows.length===0&&
          <p className="muted">No audit events have been recorded yet.</p>
        }
      </div>
    </section>
  </main>;
}
