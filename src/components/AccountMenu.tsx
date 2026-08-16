"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function AccountMenu({user}:{user:{username:string;display_name:string|null}}){
  const pathname=usePathname();
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>setOpen(false),[pathname]);

  useEffect(()=>{
    function onPointer(e:PointerEvent){
      if(open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown",onPointer);
    return ()=>window.removeEventListener("pointerdown",onPointer);
  },[open]);

  return <div className="account-menu" ref={ref}>
    <button type="button" className="btn" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>Account</button>
    {open&&<div className="account-popover">
      <div className="account-identity">
        <strong>{user.display_name??user.username}</strong>
        <span>@{user.username}</span>
      </div>
      <Link href="/availability">Availability</Link>
      <Link href="/profile">Profile & characters</Link>
      <form action="/api/auth/logout" method="post"><button type="submit">Logout</button></form>
    </div>}
  </div>;
}
