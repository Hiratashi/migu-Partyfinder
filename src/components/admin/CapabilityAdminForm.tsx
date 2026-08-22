"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Raid={
  id:string;
  name:string;
};

type Capability={
  id?:string;
  slug:string;
  name:string;
  description:string;
  category:"DAMAGE"|"GEAR"|"UTILITY"|"OTHER";
  raid_id:string|null;
  active:boolean;
  sort_order:number;
};

export default function CapabilityAdminForm({
  capability,
  raids,
}:{
  capability?:Capability;
  raids:Raid[];
}) {
  const router=useRouter();
  const editing=Boolean(capability?.id);

  const [slug,setSlug]=useState(capability?.slug??"");
  const [name,setName]=useState(capability?.name??"");
  const [description,setDescription]=useState(capability?.description??"");
  const [category,setCategory]=useState<Capability["category"]>(
    capability?.category??"OTHER",
  );
  const [raidId,setRaidId]=useState(capability?.raid_id??"");
  const [active,setActive]=useState(capability?.active??true);
  const [sortOrder,setSortOrder]=useState(capability?.sort_order??100);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function save(e:React.FormEvent) {
    e.preventDefault();
    if(busy)return;

    setBusy(true);
    setMessage("");

    const url=editing
      ? `/api/admin/capabilities/${capability!.id}`
      : "/api/admin/capabilities";

    try {
      const response=await fetch(url,{
        method:editing?"PATCH":"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          slug,
          name,
          description,
          category,
          raidId:raidId||null,
          active,
          sortOrder,
        }),
      });

      const data=await response.json().catch(()=>({}));

      if(!response.ok) {
        setMessage(
          data.message??
          data.issues?.[0]?.message??
          data.error??
          "Could not save capability.",
        );
        return;
      }

      router.push(`/admin/capabilities/${data.id??capability!.id}`);
      router.refresh();
    } catch {
      setMessage("Could not save capability. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="card form stack" onSubmit={save}>
    <div className="admin-form-grid">
      <label>
        Capability name
        <input
          value={name}
          onChange={e=>setName(e.target.value)}
          maxLength={100}
          placeholder="Green Exascale"
          required
        />
      </label>

      <label>
        Slug
        <input
          value={slug}
          onChange={e=>setSlug(e.target.value.toLowerCase())}
          maxLength={80}
          placeholder="green-exascale"
          required
        />
      </label>

      <label>
        Category
        <select
          value={category}
          onChange={e=>setCategory(
            e.target.value as Capability["category"],
          )}
        >
          <option value="DAMAGE">Damage</option>
          <option value="GEAR">Gear</option>
          <option value="UTILITY">Utility</option>
          <option value="OTHER">Other</option>
        </select>
      </label>

      <label>
        Raid scope
        <select
          value={raidId}
          onChange={e=>setRaidId(e.target.value)}
        >
          <option value="">Global - all raids</option>
          {raids.map(raid=>
            <option key={raid.id} value={raid.id}>
              {raid.name}
            </option>
          )}
        </select>
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
    </div>

    <label>
      Description
      <textarea
        value={description}
        onChange={e=>setDescription(e.target.value)}
        maxLength={300}
        rows={3}
        placeholder="Optional explanation shown to users."
      />
    </label>

    <div className="checks">
      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={e=>setActive(e.target.checked)}
        />
        Active / available to users
      </label>
    </div>

    <p className="muted">
      Global capabilities can be shown for this character in every raid.
      Raid-specific capabilities are only relevant in that raid.
    </p>

    <div className="row">
      <button className="btn primary" disabled={busy}>
        {busy
          ? "Saving..."
          : editing
            ? "Save capability"
            : "Create capability"}
      </button>
      {message&&<span className="error" role="alert">{message}</span>}
    </div>
  </form>;
}
