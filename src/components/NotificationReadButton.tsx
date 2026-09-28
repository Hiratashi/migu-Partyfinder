"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NotificationReadButton({id}:{id:string}) {
  const router=useRouter();
  const [pending,setPending]=useState(false);
  return <button className="btn" type="button" disabled={pending} onClick={async()=>{
    setPending(true);
    try {
      const response=await fetch(`/api/notifications/${id}/read`,{method:"POST"});
      if(response.ok)router.refresh();
      else alert("Could not mark this notification as read.");
    } catch {
      alert("Could not mark this notification as read.");
    } finally {
      setPending(false);
    }
  }}>Mark read</button>;
}
