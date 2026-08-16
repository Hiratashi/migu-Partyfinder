"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClassRow={
  id?:string;
  slug:string;
  name:string;
  abbreviation:string;
  damage_type:"PHYSICAL"|"MAGICAL"|"HYBRID"|"NONE";
  role:"DPS"|"SUPPORT"|"FLEX";
  icon_path:string|null;
  active:boolean;
  sort_order:number;
};

export default function ClassAdminForm({
  classRow,
}:{
  classRow?:ClassRow;
}) {
  const router=useRouter();
  const editing=Boolean(classRow?.id);

  const [slug,setSlug]=useState(classRow?.slug??"");
  const [name,setName]=useState(classRow?.name??"");
  const [abbreviation,setAbbreviation]=useState(
    classRow?.abbreviation??"",
  );
  const [damageType,setDamageType]=useState(
    classRow?.damage_type??"PHYSICAL",
  );
  const [role,setRole]=useState(classRow?.role??"DPS");
  const [iconPath,setIconPath]=useState(classRow?.icon_path??"");
  const [active,setActive]=useState(classRow?.active??true);
  const [sortOrder,setSortOrder]=useState(classRow?.sort_order??100);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function save(e:React.FormEvent) {
    e.preventDefault();
    if(busy)return;

    setBusy(true);
    setMessage("");

    const url=editing
      ? `/api/admin/classes/${classRow!.id}`
      : "/api/admin/classes";

    try {
      const r=await fetch(url,{
        method:editing?"PATCH":"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          slug,
          name,
          abbreviation,
          damageType,
          role,
          iconPath,
          active,
          sortOrder,
        }),
      });

      const j=await r.json().catch(()=>({}));

      if(!r.ok) {
        setMessage(
          j.message??
          j.issues?.[0]?.message??
          j.error??
          "Could not save class.",
        );
        return;
      }

      router.push(`/admin/classes/${j.id??classRow!.id}`);
      router.refresh();
    } catch {
      setMessage("Could not save class. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="card form stack" onSubmit={save}>
    <div className="admin-form-grid">
      <label>
        Class name
        <input
          value={name}
          onChange={e=>setName(e.target.value)}
          maxLength={100}
          placeholder="Shakti"
          required
        />
      </label>

      <label>
        Slug
        <input
          value={slug}
          onChange={e=>setSlug(e.target.value.toLowerCase())}
          maxLength={80}
          placeholder="shakti"
          required
        />
      </label>

      <label>
        Abbreviation
        <input
          value={abbreviation}
          onChange={e=>setAbbreviation(e.target.value)}
          maxLength={12}
          placeholder="SH"
          required
        />
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
        <select
          value={damageType}
          onChange={e=>setDamageType(
            e.target.value as ClassRow["damage_type"],
          )}
        >
          <option value="PHYSICAL">Physical</option>
          <option value="MAGICAL">Magical</option>
          <option value="HYBRID">Hybrid</option>
          <option value="NONE">None</option>
        </select>
      </label>

      <label>
        Party role
        <select
          value={role}
          onChange={e=>setRole(e.target.value as ClassRow["role"])}
        >
          <option value="DPS">DPS</option>
          <option value="SUPPORT">Support</option>
          <option value="FLEX">Flex</option>
        </select>
      </label>
    </div>

    <label>
      Icon path
      <input
        value={iconPath}
        onChange={e=>setIconPath(e.target.value)}
        maxLength={250}
        placeholder="/classes/shakti.png"
      />
      <span className="muted small-note">
        Optional for now. We will populate real class icons in the catalogue
        milestone.
      </span>
    </label>

    <label className="checks">
      <span>
        <input
          type="checkbox"
          checked={active}
          onChange={e=>setActive(e.target.checked)}
        />
        {" "}Active / selectable by users
      </span>
    </label>

    <div className="row">
      <button className="btn primary" disabled={busy}>
        {busy?"Saving…":editing?"Save class":"Create class"}
      </button>
      {message&&<span className="error" role="alert">{message}</span>}
    </div>
  </form>;
}
