"use client";

import { useState } from "react";

export default function DiscordFallbackPreference({initialEnabled,initialGuild}:{initialEnabled:boolean;initialGuild:boolean}) {
  const [enabled,setEnabled]=useState(initialEnabled);
  const [guild,setGuild]=useState(initialGuild);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function update(key:"enabled"|"guildFallback",next:boolean) {
    setBusy(true);
    setError("");
    try {
      const response=await fetch("/api/profile/discord-alerts",{
        method:"PATCH",headers:{"content-type":"application/json"},
        body:JSON.stringify({[key]:next}),
      });
      if(!response.ok)throw new Error();
      if(key==="enabled")setEnabled(next);
      else setGuild(next);
    } catch {setError("Could not save your Discord alert preference.");}
    finally {setBusy(false);}
  }
  return <section className="card discord-alert-settings" aria-label="Discord notification preferences">
    <h2>Discord alerts</h2>
    <label className="row">
      <input type="checkbox" checked={enabled} disabled={busy}
        onChange={event=>void update("enabled",event.target.checked)}/>
      Send me Discord notifications
    </label>
    <label className="row">
      <input type="checkbox" checked={guild} disabled={busy||!enabled}
        onChange={event=>void update("guildFallback",event.target.checked)}/>
      Mention me in the guild if a bot DM cannot be delivered
    </label>
    <p className="muted">
      Guild messages show notification details, including party and character names,
      to other guild members. Website notifications work even when Discord alerts are off.
    </p>
    {error&&<p className="error" role="alert">{error}</p>}
  </section>;
}
