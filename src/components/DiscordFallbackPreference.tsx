"use client";

import { useState } from "react";

export default function DiscordFallbackPreference({initial}:{initial:boolean}) {
  const [enabled,setEnabled]=useState(initial);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function update(next:boolean) {
    setBusy(true);
    setError("");
    try {
      const response=await fetch("/api/profile/discord-alerts",{
        method:"PATCH",headers:{"content-type":"application/json"},
        body:JSON.stringify({enabled:next}),
      });
      if(!response.ok)throw new Error();
      setEnabled(next);
    } catch {setError("Could not save your Discord alert preference.");}
    finally {setBusy(false);}
  }
  return <section className="card stack" aria-label="Discord notification preference">
    <h2>Discord alerts</h2>
    <label className="row">
      <input type="checkbox" checked={enabled} disabled={busy}
        onChange={event=>void update(event.target.checked)}/>
      Mention me in the guild if a private bot DM cannot be delivered
    </label>
    <p className="muted">
      The guild sees your mention and a link to your Partyfinder inbox, but no
      invitation or party details. You can keep Discord DMs disabled. Website
      notifications work either way.
    </p>
    {error&&<p className="error" role="alert">{error}</p>}
  </section>;
}
