"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Raid={
  id?:string;
  slug:string;
  name:string;
  party_size:number;
  supported_stages:number[];
  default_stage:number;
  practice_supported:boolean;
  active:boolean;
  sort_order:number;
};

export default function RaidAdminForm({
  raid,
}:{
  raid?:Raid;
}) {
  const router=useRouter();
  const editing=Boolean(raid?.id);

  const [slug,setSlug]=useState(raid?.slug??"");
  const [name,setName]=useState(raid?.name??"");
  const [partySize,setPartySize]=useState(raid?.party_size??6);
  const [stageText,setStageText]=useState(
    (raid?.supported_stages??[1,2,3]).join(", "),
  );
  const [defaultStage,setDefaultStage]=useState(
    raid?.default_stage??3,
  );
  const [practice,setPractice]=useState(
    raid?.practice_supported??true,
  );
  const [active,setActive]=useState(raid?.active??true);
  const [sortOrder,setSortOrder]=useState(raid?.sort_order??100);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  function stages() {
    return [...new Set(
      stageText
        .split(",")
        .map(v=>Number(v.trim()))
        .filter(v=>Number.isInteger(v)&&v>0),
    )].sort((a,b)=>a-b);
  }

  async function save(e:React.FormEvent) {
    e.preventDefault();
    if(busy)return;

    const supportedStages=stages();
    if(!supportedStages.length) {
      setMessage("Enter at least one supported stage.");
      return;
    }

    setBusy(true);
    setMessage("");

    const url=editing
      ? `/api/admin/raids/${raid!.id}`
      : "/api/admin/raids";

    try {
      const r=await fetch(url,{
        method:editing?"PATCH":"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          slug,
          name,
          partySize,
          supportedStages,
          defaultStage,
          practiceSupported:practice,
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
          "Could not save raid.",
        );
        return;
      }

      router.push(`/admin/raids/${j.id??raid!.id}`);
      router.refresh();
    } catch {
      setMessage("Could not save raid. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="card form stack" onSubmit={save}>
    <div className="admin-form-grid">
      <label>
        Raid name
        <input
          value={name}
          onChange={e=>setName(e.target.value)}
          maxLength={100}
          required
        />
      </label>

      <label>
        Slug
        <input
          value={slug}
          onChange={e=>setSlug(e.target.value.toLowerCase())}
          placeholder="example-raid"
          maxLength={80}
          required
        />
      </label>

      <label>
        Party size
        <input
          type="number"
          min={1}
          max={12}
          value={partySize}
          onChange={e=>setPartySize(Number(e.target.value))}
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
        Supported stages
        <input
          value={stageText}
          onChange={e=>setStageText(e.target.value)}
          placeholder="1, 2, 3"
        />
      </label>

      <label>
        Default stage
        <input
          type="number"
          min={1}
          max={99}
          value={defaultStage}
          onChange={e=>setDefaultStage(Number(e.target.value))}
        />
      </label>
    </div>

    <div className="checks">
      <label>
        <input
          type="checkbox"
          checked={practice}
          onChange={e=>setPractice(e.target.checked)}
        />
        Practice groups supported
      </label>

      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={e=>setActive(e.target.checked)}
        />
        Active / visible to users
      </label>
    </div>

    <div className="row">
      <button className="btn primary" disabled={busy}>
        {busy?"Saving…":editing?"Save raid":"Create raid"}
      </button>
      {message&&<span className="error" role="alert">{message}</span>}
    </div>
  </form>;
}
