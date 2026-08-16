"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClassRow={
  id?:string;
  slug:string;
  name:string;
  abbreviation:string;
  base_character:string;
  path_number:number;
  damage_type:"PHYSICAL"|"MAGICAL"|"HYBRID"|"NONE";
  role:"DPS"|"SUPPORT"|"FLEX";
  icon_path:string|null;
  active:boolean;
  sort_order:number;
};

function toUrlName(value:string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[:']/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

export default function ClassAdminForm({
  classRow,
}:{
  classRow?:ClassRow;
}) {
  const router=useRouter();
  const editing=Boolean(classRow?.id);

  const [slug,setSlug]=useState(classRow?.slug??"");
  const [slugTouched,setSlugTouched]=useState(editing);
  const [name,setName]=useState(classRow?.name??"");
  const [abbr,setAbbr]=useState(classRow?.abbreviation??"");
  const [baseCharacter,setBaseCharacter]=useState(classRow?.base_character??"");
  const [pathNumber,setPathNumber]=useState(classRow?.path_number??1);
  const [damageType,setDamageType]=useState(classRow?.damage_type??"PHYSICAL");
  const [role,setRole]=useState(classRow?.role??"DPS");
  const [iconPath,setIconPath]=useState(classRow?.icon_path??"");
  const [active,setActive]=useState(classRow?.active??true);
  const [sortOrder,setSortOrder]=useState(classRow?.sort_order??100);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  function changeName(value:string) {
    setName(value);
    if(!slugTouched)setSlug(toUrlName(value));
  }

  async function save(e:React.FormEvent) {
    e.preventDefault();
    if(busy)return;
    setBusy(true);
    setMessage("");

    const url=editing
      ? `/api/admin/classes/${classRow!.id}`
      : "/api/admin/classes";

    const r=await fetch(url,{
      method:editing?"PATCH":"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        slug,name,abbreviation:abbr,baseCharacter,pathNumber,
        damageType,role,iconPath,active,sortOrder,
      }),
    });
    const j=await r.json().catch(()=>({}));

    if(!r.ok) {
      setMessage(j.message??j.issues?.[0]?.message??j.error??"Could not save class.");
      setBusy(false);
      return;
    }

    router.push(`/admin/classes/${j.id??classRow!.id}`);
    router.refresh();
  }

  return <form className="card form stack" onSubmit={save}>
    <div className="admin-form-grid">
      <label className="admin-field-with-help">
        Class name
        <input value={name} onChange={e=>changeName(e.target.value)} required/>
        <span className="field-help" aria-hidden="true">&nbsp;</span>
      </label>

      <label className="admin-field-with-help">
        URL name
        <input
          value={slug}
          onChange={e=>{
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
          required
        />
        <span className="muted small-note field-help">
          Internal link name. Auto-generated when creating a class.
        </span>
      </label>

      <label>
        Base character
        <input
          value={baseCharacter}
          onChange={e=>setBaseCharacter(e.target.value)}
          placeholder="Eve"
          required
        />
      </label>

      <label>
        Path
        <select value={pathNumber} onChange={e=>setPathNumber(Number(e.target.value))}>
          <option value={1}>Path 1</option>
          <option value={2}>Path 2</option>
          <option value={3}>Path 3</option>
          <option value={4}>Path 4</option>
        </select>
      </label>

      <label>
        Abbreviation
        <input value={abbr} onChange={e=>setAbbr(e.target.value)} required/>
      </label>

      <label>
        Display order
        <input
          type="number"
          min={0}
          max={9999}
          value={sortOrder}
          onChange={e=>setSortOrder(Number(e.target.value))}
        />
      </label>

      <label>
        Damage type
        <select value={damageType} onChange={e=>setDamageType(e.target.value as ClassRow["damage_type"])}>
          <option value="PHYSICAL">Physical</option>
          <option value="MAGICAL">Magical</option>
          <option value="HYBRID">Hybrid</option>
          <option value="NONE">None</option>
        </select>
      </label>

      <label>
        Party role
        <select value={role} onChange={e=>setRole(e.target.value as ClassRow["role"])}>
          <option value="DPS">DPS</option>
          <option value="SUPPORT">Support</option>
          <option value="FLEX">Flex / synergy DPS</option>
        </select>
      </label>
    </div>

    <label>
      Icon / artwork URL
      <input value={iconPath} onChange={e=>setIconPath(e.target.value)}/>
    </label>

    <label className="checks">
      <span>
        <input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>
        {" "}Active / selectable by users
      </span>
    </label>

    <div className="row">
      <button className="btn primary" disabled={busy}>
        {busy?"Saving...":editing?"Save class":"Create class"}
      </button>
      {message&&<span className="error">{message}</span>}
    </div>
  </form>;
}
