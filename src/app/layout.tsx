import "./globals.css";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
export const metadata = { title: "Migu's Partyfinder Tool", description: "Guild-only Elsword raid party finder" };

export default async function RootLayout({children}:{children:React.ReactNode}) {
  const user=await currentUser();
  return <html lang="en"><body><div className="shell"><nav className="nav">
    <Link href="/" className="brand brand-home"><span>Migu's Partyfinder</span><small>Open parties</small></Link>
    <div className="navlinks">{user?<>
      <Link className="btn" href="/my-parties">My Parties</Link>
      <Link className="btn" href="/history">History</Link>
      <Link className="btn primary" href="/parties/new">+ Create Party</Link>
      <details className="account-menu">
        <summary className="btn">Account</summary>
        <div className="account-menu-panel">
          <div className="account-menu-user"><strong>{user.display_name??user.username}</strong><span>@{user.username}</span></div>
          <Link href="/availability">Availability</Link>
          <Link href="/profile">Profile & characters</Link>
          <form action="/api/auth/logout" method="post"><button type="submit">Logout</button></form>
        </div>
      </details>
    </>:<Link className="btn primary" href="/api/auth/login">Login with Discord</Link>}</div>
  </nav>{children}</div></body></html>;
}
