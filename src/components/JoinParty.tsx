"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ClassIcon from "./ClassIcon";

type Char={
  id:string;
  character_name:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path?:string|null;
  eligible?:boolean;
  reason?:string;
};

export default function JoinParty({
  partyId,
  characters,
  invited=false,
}:{
  partyId:string;
  characters:Char[];
  invited?:boolean;
}) {
  const router=useRouter();
  const first=characters.find(c=>c.eligible!==false)?.id??"";
  const [characterId,setCharacterId]=useState(first);
  const [msg,setMsg]=useState("");

  const selected=useMemo(
    ()=>characters.find(c=>c.id===characterId)??null,
    [characters,characterId],
  );

  async function join() {
    if(!characterId) {
      setMsg("Choose an eligible character.");
      return;
    }

    setMsg("Joining...");

    const r=await fetch(`/api/parties/${partyId}/join`,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({characterId}),
    });

    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      setMsg("Joined!");
      router.refresh();
      return;
    }

    setMsg(
      j.error==="character_not_needed"
        ? "That character no longer fits the requested composition. Refresh and choose another character."
        : j.error==="party_full"
          ? "The party is already full."
          : "Could not join the party.",
    );
  }

  return <div className="stack">
    <strong>{invited?"You were invited to this party":"Join this party"}</strong>

    <div className="character-picker-row">
      {selected
        ? <ClassIcon
            src={selected.icon_path}
            abbreviation={selected.abbreviation}
            name={selected.name}
          />
        : <div className="classicon"><span>?</span></div>
      }

      <select
        className="character-picker-select"
        value={characterId}
        onChange={e=>setCharacterId(e.target.value)}
      >
        <option value="">Choose a character</option>

        {characters.map(c=>
          <option
            key={c.id}
            value={c.id}
            disabled={c.eligible===false}
          >
            {c.character_name} - {c.name} ({c.abbreviation}) - {c.damage_type} {c.role}
            {c.eligible===false
              ? ` - ${c.reason??"not currently needed"}`
              : ""}
          </option>
        )}
      </select>

      <button
        className="btn primary"
        type="button"
        onClick={join}
        disabled={!characterId}
      >
        Join party
      </button>
    </div>

    {msg&&<span className="muted">{msg}</span>}
  </div>;
}
