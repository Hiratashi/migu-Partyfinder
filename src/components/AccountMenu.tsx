"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AccountMenu({displayName,username}:{displayName:string;username:string}){
  const pathname=usePathname();
  const detailsRef=useRef<HTMLDetailsElement>(null);

  useEffect(()=>{detailsRef.current?.removeAttribute("open");},[pathname]);

  function close(){detailsRef.current?.removeAttribute("open");}

  return <details ref={detailsRef} className="account-menu">
    <summary className="btn">Account</summary>
    <div className="account-menu-panel">
      <div className="account-menu-user"><strong>{displayName}</strong><span>@{username}</span></div>
      <Link href="/availability" onClick={close}>Availability</Link>
      <Link href="/profile" onClick={close}>Profile & characters</Link>
      <form action="/api/auth/logout" method="post"><button type="submit">Logout</button></form>
    </div>
  </details>;
}
