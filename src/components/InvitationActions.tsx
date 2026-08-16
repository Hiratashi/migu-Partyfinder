"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InvitationActions({partyId}:{partyId:string}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function decline(){
    if(busy)return;
    setBusy(true);setMessage("");
    const r=await fetch(`/api/invitations/${partyId}/decline`,{method:"POST"});
    const j=await r.json().catch(()=>({}));
    if(r.ok){router.refresh();return;}
    setMessage(j.error??"Could not decline invitation.");
    setBusy(false);
  }

  return <div className="row">
    <Link className="btn primary" href={`/parties/${partyId}`}>View party</Link>
    <button type="button" className="btn" onClick={decline} disabled={busy}>
      {busy?"Declining…":"Decline"}
    </button>
    {message&&<span className="error">{message}</span>}
  </div>;
}
