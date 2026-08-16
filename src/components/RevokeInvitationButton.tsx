"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RevokeInvitationButton({partyId,userId}:{partyId:string;userId:string}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function revoke(){
    if(busy)return;
    setBusy(true);setMessage("");
    const r=await fetch(`/api/parties/${partyId}/invitations/${userId}/revoke`,{method:"POST"});
    const j=await r.json().catch(()=>({}));
    if(r.ok){router.refresh();return;}
    setMessage(j.error??"Could not revoke invitation.");
    setBusy(false);
  }

  return <div className="row">
    <button type="button" className="btn danger-subtle" onClick={revoke} disabled={busy}>
      {busy?"Revoking…":"Revoke"}
    </button>
    {message&&<span className="error">{message}</span>}
  </div>;
}
