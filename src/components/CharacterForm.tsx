"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type C={
  id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  base_character:string;
  path_number:number;
};

export default function CharacterForm({
  classes,
}:{
  classes:C[];
}) {
  const router=useRouter();
  const [name,setName]=useState("");
  const [classId,setClassId]=useState(classes[0]?.id??"");
  const [msg,setMsg]=useState("");

  const groups=useMemo(()=>{
    const map=new Map<string,C[]>();
    for(const c of classes) {
      const key=c.base_character||"Other";
      const list=map.get(key)??[];
      list.push(c);
      map.set(key,list);
    }
    return [...map.entries()];
  },[classes]);

  async function save(e:React.FormEvent) {
    e.preventDefault();

    const r=await fetch("/api/profile/characters",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({characterName:name,classId}),
    });

    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      setName("");
      setMsg("Saved");
      router.refresh();
    } else {
      setMsg(j.message??j.error??"Could not save");
    }
  }

  return <form onSubmit={save} className="card form stack">
    <label>
      Character name
      <input
        value={name}
        onChange={e=>setName(e.target.value)}
        required
        minLength={2}
        maxLength={32}
      />
    </label>

    <label>
      Class
      <select value={classId} onChange={e=>setClassId(e.target.value)}>
        {groups.map(([base,items])=>
          <optgroup key={base} label={base}>
            {items.map(c=>
              <option key={c.id} value={c.id}>
                Path {c.path_number} - {c.name} ({c.abbreviation}) - {c.damage_type} {c.role}
              </option>
            )}
          </optgroup>
        )}
      </select>
    </label>

    <div className="row">
      <button className="btn primary">Add character</button>
      <span className="muted">{msg}</span>
    </div>
  </form>;
}
