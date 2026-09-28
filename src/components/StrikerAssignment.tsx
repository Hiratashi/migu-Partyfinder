"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StrikerAssignment({partyId,userId,current}:{
  partyId:string;userId:string;current:number|null;
}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function assign(value:string) {
    setBusy(true);
    setError("");
    try {
      const response=await fetch(`/api/parties/${partyId}/members/${userId}/group`,{
        method:"PATCH",headers:{"content-type":"application/json"},
        body:JSON.stringify({groupNumber:value?Number(value):null}),
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok) {
        setError(result.error==="striker_party_full"?"That Striker Party is full.":"Could not change assignment.");
      } else router.refresh();
    } catch {setError("Could not change assignment.");}
    finally {setBusy(false);}
  }
  return <label className="row">
    Striker Party
    <select key={current??0} defaultValue={current??""} disabled={busy}
      onChange={event=>assign(event.target.value)}>
      <option value="">Unassigned</option>
      <option value="1">Party 1</option>
      <option value="2">Party 2</option>
    </select>
    {error&&<span className="error" role="alert">{error}</span>}
  </label>;
}
