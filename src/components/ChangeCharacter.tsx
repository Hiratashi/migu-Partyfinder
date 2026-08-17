"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ClassIcon from "./ClassIcon";

type Char={
  id:string;
  character_name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path?:string|null;
  eligible:boolean;
  reason?:string;
};

export default function ChangeCharacter({
  partyId,
  currentCharacterId,
  characters,
}:{
  partyId:string;
  currentCharacterId:string|null;
  characters:Char[];
}) {
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [characterId,setCharacterId]=useState(
    currentCharacterId??
    characters.find(c=>c.eligible)?.id??
    "",
  );
  const [msg,setMsg]=useState("");

  const selected=useMemo(
    ()=>characters.find(c=>c.id===characterId)??null,
    [characters,characterId],
  );

  async function save() {
    if(!characterId)return;

    setMsg("Saving...");

    const r=await fetch(
      `/api/parties/${partyId}/members/me/character`,
      {
        method:"PATCH",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({characterId}),
      },
    );

    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      setMsg("");
      setOpen(false);
      router.refresh();
      return;
    }

    setMsg(
      j.error==="character_not_needed"
        ? "That character does not fit the currently enforced composition."
        : "Could not change character.",
    );
  }

  if(!open) {
    return <button
      className="btn"
      type="button"
      onClick={()=>setOpen(true)}
    >
      Change character
    </button>;
  }

  return <div className="stack">
    <div className="character-picker-row">
      {selected
        ? <ClassIcon
            src={selected.icon_path}
            abbreviation={selected.abbreviation}
            name={selected.character_name}
          />
        : <div className="classicon"><span>?</span></div>
      }

      <select
        className="character-picker-select"
        value={characterId}
        onChange={e=>setCharacterId(e.target.value)}
      >
        {characters.map(c=>
          <option
            key={c.id}
            value={c.id}
            disabled={!c.eligible}
          >
            {c.character_name} - {c.abbreviation} ({c.damage_type} {c.role})
            {!c.eligible
              ? ` - ${c.reason??"not currently needed"}`
              : ""}
          </option>
        )}
      </select>

      <button
        className="btn primary"
        type="button"
        onClick={save}
      >
        Save
      </button>

      <button
        className="btn"
        type="button"
        onClick={()=>setOpen(false)}
      >
        Cancel
      </button>
    </div>

    {msg&&<span className="error">{msg}</span>}
  </div>;
}
