"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "./AccountMenu";

export default function SiteHeader({
  user,
}:{
  user:{username:string;display_name:string|null};
}) {
  const pathname=usePathname();

  return <header className="site-header">
    <Link
      href="/"
      className="site-brand"
      aria-label="Migu's Partyfinder open parties"
    >
      <strong>Migu's Partyfinder</strong>
      <span>OPEN PARTIES</span>
    </Link>

    <nav className="site-nav" aria-label="Primary navigation">
      <Link
        className={`btn ${pathname==="/my-parties"?"active-nav":""}`}
        href="/my-parties"
      >
        My Parties
      </Link>
      <Link
        className={`btn ${pathname==="/history"?"active-nav":""}`}
        href="/history"
      >
        History
      </Link>
      <Link
        className={`btn primary ${pathname.startsWith("/raids")?"active-nav":""}`}
        href="/raids"
      >
        + Create Party
      </Link>
      <AccountMenu user={user}/>
    </nav>
  </header>;
}
