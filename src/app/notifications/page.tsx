import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { query } from "@/lib/db";
import NotificationItem from "@/components/NotificationItem";
import type { NotificationChange } from "@/lib/notifications";
import { pruneExpiredNotifications } from "@/lib/notification-retention";

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
  await pruneExpiredNotifications();
  const unread=(await searchParams).view==="unread";
  const notifications=await query<Notification>(`
    SELECT id,title,body,party_id,read_at,created_at,change_details
    FROM notifications
    WHERE user_id=$1 AND created_at>=now()-interval '30 days'
      ${unread?"AND read_at IS NULL":""}
    ORDER BY created_at DESC,id DESC
    LIMIT 100
  `,[user.id]);

  return <main>
    <h1>Notifications</h1>
    <p>Invitations and party updates appear here.</p>
    <nav className="notification-tabs" aria-label="Notification filters">
      <Link className={`btn ${unread?"":"active-nav"}`} href="/notifications">All</Link>
      <Link className={`btn ${unread?"active-nav":""}`} href="/notifications?view=unread">Unread</Link>
    </nav>
    {notifications.rows.length===0
      ? <p>{unread?"No unread notifications.":"No notifications from the past 30 days."}</p>
      : <ul className="notification-list">
          {notifications.rows.map(item=><NotificationItem key={item.id} unreadOnly={unread} item={{
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
