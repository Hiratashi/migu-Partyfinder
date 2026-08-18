"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function AccountMenu({
  user,
}:{
  user:{
    username:string;
    display_name:string|null;
    is_admin:boolean;
  };
}) {
  const pathname=usePathname();
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>setOpen(false),[pathname]);

  useEffect(()=>{
    function onPointer(e:PointerEvent) {
      if(
        open&&
        ref.current&&
        !ref.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKey(e:KeyboardEvent) {
      if(e.key==="Escape")setOpen(false);
    }

    window.addEventListener("pointerdown",onPointer);
    window.addEventListener("keydown",onKey);

    return ()=>{
      window.removeEventListener("pointerdown",onPointer);
      window.removeEventListener("keydown",onKey);
    };
  },[open]);

  return <div className="account-menu" ref={ref}>
    <button
      type="button"
      className="btn"
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={()=>setOpen(v=>!v)}
    >
      Account
    </button>

    {open&&<div className="account-popover" role="menu">
      <div className="account-identity">
        <strong>{user.display_name??user.username}</strong>
        <span>@{user.username}</span>
      </div>

      <Link href="/availability" role="menuitem">
        Availability
      </Link>
      <Link href="/profile" role="menuitem">
        Profile & characters
      </Link>

      {user.is_admin&&<>
        <div className="account-menu-divider"/>
        <Link href="/admin" role="menuitem">
          Admin dashboard
        </Link>
      </>}

      <form action="/api/auth/logout" method="post">
        <button type="submit" role="menuitem">
          Logout
        </button>
      </form>
    </div>}
  </div>;
}
