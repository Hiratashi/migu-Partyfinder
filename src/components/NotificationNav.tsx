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
    return ()=>{active=false;window.clearInterval(interval);window.removeEventListener("focus",update);};
  },[pathname]);

  return <Link className={`btn ${pathname==="/notifications"?"active-nav":""}`} href="/notifications">
    Notifications{count>0?` (${count})`:""}
  </Link>;
}
