import "./globals.css";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

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

  return <html lang="en">
    <body>
      <div className="shell">
        {user
          ? <SiteHeader user={{
              username:user.username,
              display_name:user.display_name,
              is_admin:user.is_admin,
            }}/>
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
      </div>
    </body>
  </html>;
}
