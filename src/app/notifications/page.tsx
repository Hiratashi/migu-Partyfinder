import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import NotificationItem from "@/components/NotificationItem";
import type { NotificationChange } from "@/lib/notifications";

type Notification={
  id:string;
  title:string;
  body:string;
  party_id:string|null;
  read_at:Date|null;
  created_at:Date;
  change_details:NotificationChange[];
};

export default async function NotificationsPage({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const user=await requireUser();
  const archived=(await searchParams).view==="archive";
  const notifications=await query<Notification>(`
    SELECT id,title,body,party_id,read_at,created_at,change_details
    FROM notifications
    WHERE user_id=$1 AND created_at ${archived?"<":">="} now()-interval '30 days'
    ORDER BY created_at DESC,id DESC
    LIMIT 100
  `,[user.id]);

  return <main>
    <h1>Notifications</h1>
    <p>Invitations and party updates appear here.</p>
    <nav className="notification-tabs" aria-label="Notification history">
      <Link className={`btn ${archived?"":"active-nav"}`} href="/notifications">Recent</Link>
      <Link className={`btn ${archived?"active-nav":""}`} href="/notifications?view=archive">Archive (30+ days)</Link>
    </nav>
    {notifications.rows.length===0
      ? <p>{archived?"No archived notifications.":"No recent notifications."}</p>
      : <ul className="notification-list">
          {notifications.rows.map(item=><NotificationItem key={item.id} item={{
            id:item.id,
            title:item.title,
            body:item.body,
            partyId:item.party_id,
            read:Boolean(item.read_at),
            createdAt:item.created_at.toISOString(),
            changeDetails:item.change_details,
          }}/>) }
        </ul>}
  </main>;
}
import Link from "next/link";
