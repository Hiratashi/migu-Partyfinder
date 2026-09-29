"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LocalDateTime from "@/components/LocalDateTime";
import type { NotificationChange } from "@/lib/notifications";

export default function ReconfirmationPrompt({partyId,revision,changes,response}:{
  partyId:string;
  revision:string;
  changes:NotificationChange[];
  response:string;
}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const display=(value:string,format?:"datetime")=>
    format==="datetime"&&value!=="None"?<LocalDateTime iso={value}/>:value;

  async function respond(action:"ACCEPT"|"DECLINE") {
    setBusy(true);
    setError("");
    try {
      const response=await fetch(`/api/parties/${partyId}/reconfirmation`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,revision}),
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok) {
        setError(result.message??"Could not respond. Refresh the party and review the latest changes.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not respond. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="card stack" aria-labelledby="reconfirmation-title">
    <h2 id="reconfirmation-title">{response==="DECLINED"?"You declined these changes":"Needs reconfirmation"}</h2>
    <p>Your place remains reserved. Accept to confirm the current details, or decline while the group discusses another option. You can leave separately to free your place.</p>
    <div className="notification-change-list">
      {changes.map(change=><div className="notification-change" key={change.label}>
        <strong>{change.label}</strong>
        <div className="notification-change-values">
          <span className="notification-before"><small>Before</small>{display(change.before,change.format)}</span>
          <span className="notification-after"><small>After</small>{display(change.after,change.format)}</span>
        </div>
      </div>)}
    </div>
    <div className="row">
      <button className="btn primary" type="button" disabled={busy} onClick={()=>respond("ACCEPT")}>Accept changes</button>
      {response!=="DECLINED"&&<button className="btn" type="button" disabled={busy} onClick={()=>respond("DECLINE")}>Decline changes</button>}
    </div>
    {error&&<p className="error" role="alert">{error}</p>}
  </section>;
}
