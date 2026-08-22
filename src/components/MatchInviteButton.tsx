"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MatchInviteButton({
  partyId,
  userId,
  preferredCharacterIds=[],
}:{
  partyId:string;
  userId:string;
  preferredCharacterIds?:string[];
}) {
  const router=useRouter();
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);

  async function invite() {
    if(busy)return;

    setBusy(true);
    setMsg("");

    try {
      const r=await fetch(`/api/parties/${partyId}/invite`,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          userId,
          preferredCharacterIds,
        }),
      });

      const j=await r.json().catch(()=>({}));

      if(r.ok) {
        setMsg("Invited");
        router.refresh();
        return;
      }

      setMsg(j.message??j.error??"Could not invite player.");
    } catch {
      setMsg("Could not invite player.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="row">
    <button
      className="btn primary"
      type="button"
      onClick={invite}
      disabled={busy}
    >
      {busy?"Inviting...":"Invite"}
    </button>
    {msg&&<span className="muted">{msg}</span>}
  </div>;
}
