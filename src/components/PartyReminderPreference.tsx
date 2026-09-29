"use client";

import { useState } from "react";

export default function PartyReminderPreference({initialMinutes}:{initialMinutes:number|null}) {
  const [enabled,setEnabled]=useState(initialMinutes!==null);
  const [minutes,setMinutes]=useState(String(initialMinutes??30));
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function save() {
    const parsed=enabled?Number(minutes):null;
    if(parsed!==null&&(!Number.isInteger(parsed)||parsed<1||parsed>10080)) {
      setMessage("Choose 1–10080 minutes, or turn the reminder off.");return;
    }
    setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/profile/party-reminder",{
        method:"PATCH",headers:{"content-type":"application/json"},
        body:JSON.stringify({minutes:parsed}),
      });
      if(!response.ok)throw new Error();
      setMessage("Reminder preference saved.");
    } catch {setMessage("Could not save reminder preference.");}
    finally {setBusy(false);}
  }
  return <section className="card stack" aria-label="Party reminder preference">
    <h2>Party reminder</h2>
    <p className="muted">The default is 30 minutes before the raid. When a party is full,
      accepted members receive their own reminder. If places remain, only the leader is reminded.
      Website notifications always work; Discord delivery follows your Discord alert setting.</p>
    <label className="row">
      <input type="checkbox" checked={enabled} disabled={busy}
        onChange={event=>setEnabled(event.target.checked)}/>
      Remind me before a party starts
    </label>
    {enabled&&<label className="row">Minutes before start
      <input type="number" min={1} max={10080} step={1} value={minutes}
        disabled={busy} onChange={event=>setMinutes(event.target.value)} />
    </label>}
    <div className="row"><button className="btn" type="button" disabled={busy} onClick={()=>void save()}>Save reminder</button>
      <span role="status">{message}</span></div>
  </section>;
}
