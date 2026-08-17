import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import AdminSectionToolbar from "@/components/admin/AdminSectionToolbar";
import AdminPartyCancelButton from "@/components/admin/AdminPartyCancelButton";
import LocalDateTime from "@/components/LocalDateTime";

type PartyRow={
  id:string;
  status:"OPEN"|"FULL";
  start_time:Date;
  end_time:Date|null;
  leader_id:string;
  username:string;
  display_name:string|null;
  member_count:number;
};

export default async function AdminPartiesPage() {
  await requireAdmin();

  const parties=await query<PartyRow>(`
    SELECT
      p.id,
      p.status,
      p.start_time,
      p.end_time,
      p.leader_id,
      u.username,
      u.display_name,
      (
        SELECT COUNT(*)::int
        FROM party_members pm
        WHERE pm.party_id=p.id
          AND pm.status='ACCEPTED'
      ) member_count
    FROM parties p
    JOIN users u ON u.id=p.leader_id
    WHERE p.status IN ('OPEN','FULL')
    ORDER BY p.start_time ASC,p.created_at ASC
  `);

  return <main className="admin-page">
    <div>
      <div className="eyebrow">Administration</div>
      <h1>Party moderation</h1>
      <p className="muted">
        Inspect active parties and cancel a party only when administrative
        intervention is required.
      </p>
    </div>

    <AdminSectionToolbar current="parties"/>

    <div className="admin-party-moderation-summary">
      <span className="muted">
        {parties.rows.length} active part{parties.rows.length===1?"y":"ies"}
      </span>
      <span className="muted">
        Only OPEN and FULL parties are shown.
      </span>
    </div>

    <section className="admin-party-moderation-list">
      {parties.rows.map(p=>
        <article className="card admin-party-moderation-row" key={p.id}>
          <div className="admin-party-moderation-main">
            <div className="admin-party-moderation-status">
              <span className={`badge ${p.status==="FULL"?"":"ok"}`}>
                {p.status}
              </span>
            </div>

            <div>
              <span className="muted">Leader</span>
              <strong>{p.display_name??p.username}</strong>
              <small className="muted">@{p.username}</small>
            </div>

            <div>
              <span className="muted">Scheduled</span>
              <strong>
                <LocalDateTime iso={p.start_time.toISOString()}/>
              </strong>
              {p.end_time&&
                <small className="muted">
                  until <LocalDateTime iso={p.end_time.toISOString()}/>
                </small>
              }
            </div>

            <div>
              <span className="muted">Members</span>
              <strong>{p.member_count}</strong>
            </div>
          </div>

          <div className="admin-party-moderation-actions">
            <Link className="btn" href={`/parties/${p.id}`}>
              View party
            </Link>

            <AdminPartyCancelButton
              partyId={p.id}
              leaderName={p.display_name??p.username}
            />
          </div>
        </article>
      )}

      {parties.rows.length===0&&
        <div className="card admin-party-moderation-empty">
          <strong>No active parties</strong>
          <p className="muted">
            There are currently no OPEN or FULL parties requiring moderation.
          </p>
        </div>
      }
    </section>
  </main>;
}
