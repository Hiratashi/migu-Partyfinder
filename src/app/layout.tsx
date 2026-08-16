import "./globals.css";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
export const metadata = { title: "Migu's Partyfinder Tool", description: "Guild-only Elsword raid party finder" };
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const user=await currentUser();
  return <html lang="en"><body><div className="shell"><nav className="nav">
    <Link href="/" className="brand">Migu's Partyfinder</Link>
    <div className="navlinks">{user?<>
      <Link className="btn" href="/">Parties</Link>
      <Link className="btn" href="/availability">Availability</Link>
      <Link className="btn" href="/history">History</Link>
      <Link className="btn" href="/profile">Profile</Link>
      <Link className="btn primary" href="/parties/new">+ Create Party</Link>
      <form action="/api/auth/logout" method="post"><button className="btn">Logout</button></form>
    </>:<Link className="btn primary" href="/api/auth/login">Login with Discord</Link>}</div>
  </nav>{children}</div></body></html>
}
