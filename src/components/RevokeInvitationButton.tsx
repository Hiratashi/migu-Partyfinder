"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RevokeInvitationButton({
  partyId,
  userId,
}:{
  partyId:string;
  userId:string;
}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function revoke() {
    if(busy)return;
    setBusy(true);
    setMessage("");

    try {
      const r=await fetch(
        `/api/parties/${partyId}/invitations/${userId}/revoke`,
        {method:"POST",headers:{"accept":"application/json"}},
      );
      const j=await r.json().catch(()=>({}));

      if(r.ok) {
        router.refresh();
        return;
      }

      setMessage(j.message??j.error??"Could not revoke invitation.");
    } catch {
      setMessage("Could not revoke invitation. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="stack">
    <button
      type="button"
      className="btn danger-subtle compact"
      onClick={revoke}
      disabled={busy}
    >
      {busy?"Revoking…":"Revoke"}
    </button>
    {message&&<span className="error" role="alert">{message}</span>}
  </div>;
}
