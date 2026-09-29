"use client";

import { useState } from "react";
import ReminderTiming from "./ReminderTiming";

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
  return <section className="card stack party-reminder-settings" aria-label="Party reminder preference">
    <h2>Full party reminder</h2>
    <p className="muted">Get a reminder when a full raid party is about to start. The default is 30 minutes.
      Discord delivery follows your alert setting; the reminder also appears on the website.</p>
    <label className="row">
      <input type="checkbox" checked={enabled} disabled={busy}
        onChange={event=>setEnabled(event.target.checked)}/>
      Remind me when a full party starts
    </label>
    {enabled&&<ReminderTiming minutes={minutes} onChange={setMinutes} disabled={busy}/>}
    <div className="row"><button className="btn" type="button" disabled={busy} onClick={()=>void save()}>Save reminder</button>
      <span role="status">{message}</span></div>
  </section>;
}
