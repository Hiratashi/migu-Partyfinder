"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { usePathname } from "next/navigation";

export default function NotificationNav({initialCount}:{initialCount:number}) {
  const pathname=usePathname();
  const [count,setCount]=useState(initialCount);

  useEffect(()=>setCount(initialCount),[initialCount]);

  useEffect(()=>{
    let active=true;
    const update=async()=>{
      if(document.visibilityState!=="visible")return;
      try {
        const response=await fetch("/api/notifications/unread",{cache:"no-store"});
        if(response.ok) {
          const data=await response.json();
          if(active&&Number.isFinite(data.count))setCount(data.count);
        }
      } catch { /* Existing inbox remains accessible during a transient failure. */ }
    };
    void update();
    const interval=window.setInterval(update,30000);
    window.addEventListener("focus",update);
    window.addEventListener("partyfinder:notifications-changed",update);
    return ()=>{
      active=false;
      window.clearInterval(interval);
      window.removeEventListener("focus",update);
      window.removeEventListener("partyfinder:notifications-changed",update);
    };
  },[pathname]);

  return <Link
    className={`btn notification-bell ${pathname.startsWith("/notifications")?"active-nav":""}`}
    href="/notifications"
    aria-label={`Notifications${count>0?`, ${count} unread`:""}`}
    title="Notifications"
  >
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/>
      <path d="M10 21h4"/>
    </svg>
    {count>0&&<span className="notification-badge" aria-hidden="true">{count>99?"99+":count}</span>}
  </Link>;
}
