"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

function safeReturnTo(value?:string) {
  if (!value) return "/my-parties";
  if (!value.startsWith("/") || value.startsWith("//")) return "/my-parties";
  return value;
}

export default function InvitationActions({
  partyId,
  showView=true,
  returnTo="/my-parties",
}:{
  partyId:string;
  showView?:boolean;
  returnTo?:string;
}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const destination=safeReturnTo(returnTo);
  const partyHref=`/parties/${partyId}?from=${encodeURIComponent(destination)}`;

  async function decline() {
    if(busy)return;
    setBusy(true);
    setMessage("");

    try {
      const r=await fetch(`/api/invitations/${partyId}/decline`,{
        method:"POST",
        headers:{"accept":"application/json"},
      });
      const j=await r.json().catch(()=>({}));

      if(r.ok) {
        router.push(destination);
        router.refresh();
        return;
      }

      setMessage(j.message??j.error??"Could not decline invitation.");
    } catch {
      setMessage("Could not decline invitation. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="stack">
    <div className="row">
      {showView&&
        <Link className="btn primary" href={partyHref}>
          View party
        </Link>
      }
      <button
        type="button"
        className="btn danger-subtle"
        onClick={decline}
        disabled={busy}
      >
        {busy?"Declining…":"Decline"}
      </button>
    </div>
    {message&&<span className="error" role="alert">{message}</span>}
  </div>;
}
