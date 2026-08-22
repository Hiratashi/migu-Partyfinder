"use client";

import { useMemo, useState } from "react";

type Capability={
  id:string;
  name:string;
  description:string;
  category:"DAMAGE"|"GEAR"|"UTILITY"|"OTHER";
  raid_id:string|null;
  raid_name:string|null;
  sort_order:number;
};

const categoryLabel={
  DAMAGE:"Damage",
  GEAR:"Gear",
  UTILITY:"Utility",
  OTHER:"Other",
} as const;

export default function CharacterCapabilities({
  characterId,
  capabilities,
  initialSelectedIds,
}:{
  characterId:string;
  capabilities:Capability[];
  initialSelectedIds:string[];
}) {
  const [selected,setSelected]=useState<string[]>(initialSelectedIds);
  const [saved,setSaved]=useState<string[]>(initialSelectedIds);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const groups=useMemo(()=>{
    const map=new Map<string,{
      raidId:string|null;
      raidName:string;
      items:Capability[];
    }>();

    for(const capability of capabilities) {
      const key=capability.raid_id??"global";
      const current=map.get(key)??{
        raidId:capability.raid_id,
        raidName:capability.raid_name??"Global",
        items:[],
      };

      current.items.push(capability);
      map.set(key,current);
    }

    return [...map.values()].sort((a,b)=>{
      if(a.raidId===null)return -1;
      if(b.raidId===null)return 1;
      return a.raidName.localeCompare(b.raidName);
    });
  },[capabilities]);

  const dirty=
    [...selected].sort().join(",")!==[...saved].sort().join(",");

  function toggle(id:string) {
    setSelected(current=>
      current.includes(id)
        ? current.filter(value=>value!==id)
        : [...current,id],
    );
    setMessage("");
  }

  async function save() {
    if(busy||!dirty)return;

    setBusy(true);
    setMessage("");

    try {
      const response=await fetch(
        `/api/profile/characters/${characterId}/capabilities`,
        {
          method:"PUT",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({
            capabilityIds:selected,
          }),
        },
      );

      const data=await response.json().catch(()=>({}));

      if(!response.ok) {
        setMessage(
          data.message??
          data.issues?.[0]?.message??
          data.error??
          "Could not save capabilities.",
        );
        return;
      }

      setSaved(selected);
      setMessage("Saved");
    } catch {
      setMessage("Could not save capabilities. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if(capabilities.length===0) {
    return <div className="character-capabilities">
      <div className="character-capability-heading">
        <strong>Capabilities</strong>
      </div>
      <span className="muted">
        No capabilities are currently available.
      </span>
    </div>;
  }

  return <div className="character-capabilities">
    <div className="character-capability-heading">
      <strong>Capabilities</strong>
      <span className="muted">
        Select what this character can contribute.
      </span>
    </div>

    <div className="character-capability-groups">
      {groups.map(group=>
        <section
          className="character-capability-group"
          key={group.raidId??"global"}
        >
          <div className="character-capability-group-title">
            {group.raidName}
          </div>

          <div className="character-capability-options">
            {group.items.map(capability=>{
              const checked=selected.includes(capability.id);

              return <label
                className={`character-capability-option ${
                  checked?"selected":""
                }`}
                key={capability.id}
                title={capability.description||undefined}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={()=>toggle(capability.id)}
                />

                <span className="character-capability-option-copy">
                  <strong>{capability.name}</strong>
                  <small className="muted">
                    {categoryLabel[capability.category]}
                  </small>
                </span>
              </label>;
            })}
          </div>
        </section>
      )}
    </div>

    <div className="row character-capability-save">
      <button
        type="button"
        className="btn"
        onClick={save}
        disabled={busy||!dirty}
      >
        {busy?"Saving...":"Save capabilities"}
      </button>

      {dirty&&
        <button
          type="button"
          className="btn"
          onClick={()=>{
            setSelected(saved);
            setMessage("");
          }}
          disabled={busy}
        >
          Reset
        </button>
      }

      {message&&
        <span
          className={message==="Saved"?"good":"error"}
          role="status"
        >
          {message}
        </span>
      }
    </div>
  </div>;
}
