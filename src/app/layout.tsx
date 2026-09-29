import "./globals.css";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import { query } from "@/lib/db";
import { pruneExpiredNotifications } from "@/lib/notification-retention";

export const metadata = {
  title: "Migu's Partyfinder Tool",
  description: "Guild-only raid party finder",
};

export default async function RootLayout({
  children,
}:{
  children:React.ReactNode;
}) {
  const user=await currentUser();
  if(user)await pruneExpiredNotifications();
  const unread=user
    ? await query<{count:string}>("SELECT count(*)::text AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL",[user.id])
    : null;

  return <html lang="en">
    <body>
      <div className="shell">
        {user
          ? <SiteHeader user={{
              username:user.username,
              display_name:user.display_name,
              is_admin:user.is_admin,
            }} unreadNotifications={Number(unread?.rows[0]?.count??0)}/>
          : <nav className="nav">
              <Link href="/" className="brand brand-home">
                <span>Migu's Partyfinder</span>
                <small>Open parties</small>
              </Link>
              <div className="navlinks">
                <Link className="btn primary" href="/api/auth/login">
                  Login with Discord
                </Link>
              </div>
            </nav>
        }
        {children}
        <footer className="site-footer">
          <span>Enjoying Migu&apos;s Partyfinder? Supporting the project is optional.</span>
          <div className="site-footer-links">
            <a href="https://ko-fi.com/hiratashi" target="_blank" rel="noopener noreferrer">
              Support on Ko-fi
            </a>
            <a href="https://ko-fi.com/hiratashi/goal?g=0" target="_blank" rel="noopener noreferrer">
              View the goal
            </a>
          </div>
        </footer>
      </div>
    </body>
  </html>;
}
