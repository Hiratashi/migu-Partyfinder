import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import NotificationReadButton from "@/components/NotificationReadButton";
import LocalDateTime from "@/components/LocalDateTime";

type Notification={
  id:string;
  title:string;
  body:string;
  party_id:string|null;
  read_at:Date|null;
  created_at:Date;
};

export default async function NotificationsPage() {
  const user=await requireUser();
  const notifications=await query<Notification>(`
    SELECT id,title,body,party_id,read_at,created_at
    FROM notifications
    WHERE user_id=$1
    ORDER BY created_at DESC,id DESC
    LIMIT 100
  `,[user.id]);

  return <main>
    <h1>Notifications</h1>
    <p>Invitations and party updates appear here.</p>
    {notifications.rows.length===0
      ? <p>No notifications yet.</p>
      : <ul className="notification-list">
          {notifications.rows.map(item=><li key={item.id} className="notification-item">
            <div>
              <strong>{item.title}</strong>{!item.read_at&&" · Unread"}
              <p>{item.body}</p>
              <small><LocalDateTime iso={item.created_at.toISOString()}/></small>
            </div>
            <div className="notification-actions">
              {item.party_id&&<Link className="btn" href={`/parties/${item.party_id}`}>View party</Link>}
              {!item.read_at&&<NotificationReadButton id={item.id}/>}
            </div>
          </li>)}
        </ul>}
  </main>;
}
