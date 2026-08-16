import "./globals.css";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import AccountMenu from "@/components/AccountMenu";
export const metadata = { title: "Migu's Partyfinder Tool", description: "Guild-only Elsword raid party finder" };

export default async function RootLayout({children}:{children:React.ReactNode}) {
  const user=await currentUser();
  return <html lang="en"><body><div className="shell"><nav className="nav">
    <Link href="/" className="brand brand-home"><span>Migu's Partyfinder</span><small>Open parties</small></Link>
    <div className="navlinks">{user?<>
      <Link className="btn" href="/my-parties">My Parties</Link>
      <Link className="btn" href="/history">History</Link>
      <Link className="btn primary" href="/parties/new">+ Create Party</Link>
      <AccountMenu displayName={user.display_name??user.username} username={user.username}/>
    </>:<Link className="btn primary" href="/api/auth/login">Login with Discord</Link>}</div>
  </nav>{children}</div></body></html>;
}
