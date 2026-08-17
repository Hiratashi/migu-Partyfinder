import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import ClassIcon from "@/components/ClassIcon";
import UserAdminActions from "@/components/admin/UserAdminActions";

type U={
  id:string;
  discord_id:string;
  username:string;
  display_name:string|null;
  avatar_url:string|null;
  is_admin:boolean;
  access_disabled:boolean;
  created_at:Date;
  updated_at:Date;
  last_login_at:Date|null;
};

type C={
  id:string;
  character_name:string;
  archived_at:Date|null;
  class_name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
};

function dateText(value:Date|null) {
  if(!value)return "Never";
  return new Intl.DateTimeFormat("en-GB",{
    dateStyle:"medium",
    timeStyle:"short",
    timeZone:"UTC",
  }).format(new Date(value))+" UTC";
}

export default async function AdminUserPage({
  params,
}:{
  params:Promise<{id:string}>;
}) {
  const admin=await requireAdmin();
  const {id}=await params;

  const user=await query<U>(`
    SELECT
      id,
      discord_id,
      username,
      display_name,
      avatar_url,
      is_admin,
      access_disabled,
      created_at,
      updated_at,
      last_login_at
    FROM users
    WHERE id=$1
  `,[id]);

  if(!user.rowCount)notFound();
  const u=user.rows[0];

  const characters=await query<C>(`
    SELECT
      ch.id,
      ch.character_name,
      ch.archived_at,
      c.name class_name,
      c.abbreviation,
      c.damage_type,
      c.role,
      c.icon_path
    FROM characters ch
    JOIN classes c ON c.id=ch.class_id
    WHERE ch.user_id=$1
    ORDER BY
      ch.archived_at NULLS FIRST,
      ch.character_name
  `,[id]);

  const partyStats=await query<{
    led_active:number;
    joined_active:number;
    history_count:number;
  }>(`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM parties p
        WHERE p.leader_id=$1
          AND p.status IN ('OPEN','FULL')
      ) led_active,
      (
        SELECT COUNT(*)::int
        FROM party_members pm
        JOIN parties p ON p.id=pm.party_id
        WHERE pm.user_id=$1
          AND pm.status='ACCEPTED'
          AND p.status IN ('OPEN','FULL')
      ) joined_active,
      (
        SELECT COUNT(*)::int
        FROM party_members pm
        JOIN parties p ON p.id=pm.party_id
        WHERE pm.user_id=$1
          AND pm.status='ACCEPTED'
          AND p.status IN ('DONE','CANCELLED','EXPIRED')
      ) history_count
  `,[id]);

  const ps=partyStats.rows[0];

  return <main>
    <div className="row between">
      <div className="admin-user-detail-header">
        {u.avatar_url
          ? <img
              className="admin-user-avatar admin-user-avatar-large"
              src={u.avatar_url}
              alt=""
              referrerPolicy="no-referrer"
            />
          : <div className="admin-user-avatar admin-user-avatar-large admin-user-avatar-fallback">
              ?
            </div>
        }

        <div>
          <div className="eyebrow">Administration - User</div>
          <h1>{u.display_name??u.username}</h1>
        </div>
      </div>

      <Link className="btn" href="/admin/users">
        Back to users
      </Link>
    </div>

    <section className="card stack">
      <div className="row between">
        <div>
          <h2 style={{margin:0}}>Access</h2>
          <p className="muted">
            Discord ID: {u.discord_id}
          </p>
        </div>

        <div className="row">
          {u.is_admin&&<span className="pill">ADMIN</span>}
          <span className={`pill ${u.access_disabled?"admin-user-disabled":""}`}>
            {u.access_disabled?"DISABLED":"ENABLED"}
          </span>
        </div>
      </div>

      <div className="admin-user-detail-grid">
        <div>
          <span className="muted">Discord username</span>
          <strong>@{u.username}</strong>
        </div>
        <div>
          <span className="muted">Joined Partyfinder</span>
          <strong>{dateText(u.created_at)}</strong>
        </div>
        <div>
          <span className="muted">Last successful login</span>
          <strong>{dateText(u.last_login_at)}</strong>
        </div>
        <div>
          <span className="muted">Active parties led</span>
          <strong>{ps.led_active}</strong>
        </div>
        <div>
          <span className="muted">Active memberships</span>
          <strong>{ps.joined_active}</strong>
        </div>
        <div>
          <span className="muted">Historical memberships</span>
          <strong>{ps.history_count}</strong>
        </div>
      </div>

      <UserAdminActions
        userId={u.id}
        displayName={u.display_name??u.username}
        isAdmin={u.is_admin}
        accessDisabled={u.access_disabled}
        isSelf={u.id===admin.id}
      />
    </section>

    <h2 className="section-title">Characters</h2>

    <div className="grid">
      {characters.rows.map(c=>
        <article
          className={`card admin-user-character ${c.archived_at?"admin-user-character-archived":""}`}
          key={c.id}
        >
          <ClassIcon
            src={c.icon_path}
            abbreviation={c.abbreviation}
            name={c.class_name}
          />

          <div>
            <strong>{c.character_name}</strong>
            <div className="muted">
              {c.class_name} - {c.damage_type} {c.role}
            </div>
          </div>

          {c.archived_at&&
            <span className="pill">ARCHIVED</span>
          }
        </article>
      )}

      {characters.rows.length===0&&
        <div className="card muted">
          This user has no characters.
        </div>
      }
    </div>
  </main>;
}
