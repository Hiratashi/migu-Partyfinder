import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import AdminSectionToolbar from "@/components/admin/AdminSectionToolbar";
import UserFilters from "@/components/admin/UserFilters";

type U={
  id:string;
  username:string;
  display_name:string|null;
  avatar_url:string|null;
  is_admin:boolean;
  access_disabled:boolean;
  created_at:Date;
  last_login_at:Date|null;
  character_count:number;
  active_party_count:number;
};

function dateText(value:Date|null) {
  if(!value)return "Never";
  return new Intl.DateTimeFormat("en-GB",{
    dateStyle:"medium",
    timeStyle:"short",
    timeZone:"UTC",
  }).format(new Date(value))+" UTC";
}

export default async function AdminUsersPage({
  searchParams,
}:{
  searchParams:Promise<{q?:string;status?:string}>;
}) {
  await requireAdmin();

  const {q="",status="all"}=await searchParams;
  const search=q.trim();

  const users=await query<U>(`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.is_admin,
      u.access_disabled,
      u.created_at,
      u.last_login_at,
      COUNT(DISTINCT ch.id)
        FILTER (WHERE ch.archived_at IS NULL)::int character_count,
      COUNT(DISTINCT pm.party_id)
        FILTER (
          WHERE pm.status='ACCEPTED'
            AND p.status IN ('OPEN','FULL')
        )::int active_party_count
    FROM users u
    LEFT JOIN characters ch ON ch.user_id=u.id
    LEFT JOIN party_members pm ON pm.user_id=u.id
    LEFT JOIN parties p ON p.id=pm.party_id
    WHERE (
      $1='' OR
      u.username ILIKE '%'||$1||'%' OR
      COALESCE(u.display_name,'') ILIKE '%'||$1||'%'
    )
    AND (
      $2='all' OR
      ($2='enabled' AND u.access_disabled=false) OR
      ($2='disabled' AND u.access_disabled=true) OR
      ($2='admins' AND u.is_admin=true)
    )
    GROUP BY u.id
    ORDER BY
      u.access_disabled ASC,
      u.is_admin DESC,
      COALESCE(u.display_name,u.username)
  `,[search,status]);

  const counts=await query<{
    total:number;
    admins:number;
    disabled:number;
  }>(`
    SELECT
      COUNT(*)::int total,
      COUNT(*) FILTER (WHERE is_admin=true)::int admins,
      COUNT(*) FILTER (WHERE access_disabled=true)::int disabled
    FROM users
  `);

  const c=counts.rows[0];

  return <main className="admin-page">
    <div>
      <div className="eyebrow">Administration</div>
      <h1>Users</h1>
      <p className="muted">
        Manage Partyfinder access and administrator permissions.
      </p>
    </div>

    <AdminSectionToolbar current="users"/>

    <div className="admin-user-stats">
      <div className="card">
        <span className="muted">Users</span>
        <strong>{c.total}</strong>
      </div>
      <div className="card">
        <span className="muted">Admins</span>
        <strong>{c.admins}</strong>
      </div>
      <div className="card">
        <span className="muted">Disabled</span>
        <strong>{c.disabled}</strong>
      </div>
    </div>
    <UserFilters q={search} status={status}/>

    <div className="admin-user-list">
      {users.rows.map(u=>
        <article className="card admin-user-row" key={u.id}>
          <div className="admin-user-identity">
            {u.avatar_url
              ? <img
                  className="admin-user-avatar"
                  src={u.avatar_url}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              : <div className="admin-user-avatar admin-user-avatar-fallback">
                  ?
                </div>
            }

            <div>
              <strong>{u.display_name??u.username}</strong>
              <div className="muted">@{u.username}</div>
            </div>
          </div>

          <div className="admin-user-badges">
            {u.is_admin&&<span className="pill">ADMIN</span>}
            <span className={`pill ${u.access_disabled?"admin-user-disabled":""}`}>
              {u.access_disabled?"DISABLED":"ENABLED"}
            </span>
          </div>

          <div className="admin-user-meta">
            <span>
              <small>Characters</small>
              <strong>{u.character_count}</strong>
            </span>
            <span>
              <small>Active parties</small>
              <strong>{u.active_party_count}</strong>
            </span>
            <span>
              <small>Last login</small>
              <strong>{dateText(u.last_login_at)}</strong>
            </span>
          </div>

          <Link className="btn" href={`/admin/users/${u.id}`}>
            Manage user
          </Link>
        </article>
      )}

      {users.rows.length===0&&
        <div className="card muted">
          No users match the current filter.
        </div>
      }
    </div>
  </main>;
}
