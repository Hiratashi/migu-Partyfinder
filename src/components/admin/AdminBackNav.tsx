import Link from "next/link";

export default function AdminBackNav({
  current,
}:{
  current?:string;
}) {
  return <nav className="admin-section-nav" aria-label="Administration">
    <Link
      className={current==="dashboard"?"active":""}
      href="/admin"
    >
      Dashboard
    </Link>
    <Link
      className={current==="users"?"active":""}
      href="/admin/users"
    >
      Users
    </Link>
    <Link
      className={current==="raids"?"active":""}
      href="/admin/raids"
    >
      Raids
    </Link>
    <Link
      className={current==="classes"?"active":""}
      href="/admin/classes"
    >
      Classes
    </Link>
    <Link
      className={current==="parties"?"active":""}
      href="/admin/parties"
    >
      Parties
    </Link>
    <Link
      className={current==="audit"?"active":""}
      href="/admin/audit"
    >
      Audit log
    </Link>
  </nav>;
}
