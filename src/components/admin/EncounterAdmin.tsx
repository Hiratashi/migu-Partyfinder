"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminConfirmDialog from "./AdminConfirmDialog";

type Encounter={
  id:string;
  code:string;
  name:string;
  sort_order:number;
};

function EncounterRow({
  raidId,
  encounter,
}:{
  raidId:string;
  encounter:Encounter;
}) {
  const router=useRouter();
  const [code,setCode]=useState(encounter.code);
  const [name,setName]=useState(encounter.name);
  const [sortOrder,setSortOrder]=useState(encounter.sort_order);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [confirmOpen,setConfirmOpen]=useState(false);

  async function save() {
    setBusy(true);
    setMessage("");

    const r=await fetch(
      `/api/admin/raids/${raidId}/encounters/${encounter.id}`,
      {
        method:"PATCH",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({code,name,sortOrder}),
      },
    );
    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      router.refresh();
      setMessage("Saved.");
    } else {
      setMessage(j.message??j.error??"Could not save.");
    }

    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    setMessage("");

    const r=await fetch(
      `/api/admin/raids/${raidId}/encounters/${encounter.id}`,
      {method:"DELETE"},
    );
    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      setConfirmOpen(false);
      router.refresh();
      return;
    }

    setMessage(
      j.message??
      j.error??
      "Could not remove encounter.",
    );
    setConfirmOpen(false);
    setBusy(false);
  }

  return <>
    <article className="card admin-encounter-row">
      <label>
        Code
        <input value={code} onChange={e=>setCode(e.target.value)}/>
      </label>

      <label className="admin-encounter-name">
        Name
        <input value={name} onChange={e=>setName(e.target.value)}/>
      </label>

      <label>
        Order
        <input
          type="number"
          min={0}
          max={9999}
          value={sortOrder}
          onChange={e=>setSortOrder(Number(e.target.value))}
        />
      </label>

      <div className="row admin-encounter-actions">
        <button
          type="button"
          className="btn"
          onClick={save}
          disabled={busy}
        >
          Save
        </button>

        <button
          type="button"
          className="btn danger-subtle"
          onClick={()=>setConfirmOpen(true)}
          disabled={busy}
        >
          Remove
        </button>
      </div>

      {message&&
        <span className="error admin-row-message" role="alert">
          {message}
        </span>
      }
    </article>

    <AdminConfirmDialog
      open={confirmOpen}
      title={`Remove ${encounter.code}?`}
      message="This permanently removes the encounter. Removal is only allowed when no party or availability profile references it."
      confirmLabel="Remove encounter"
      busy={busy}
      onCancel={()=>setConfirmOpen(false)}
      onConfirm={remove}
    />
  </>;
}

export default function EncounterAdmin({
  raidId,
  encounters,
}:{
  raidId:string;
  encounters:Encounter[];
}) {
  const router=useRouter();
  const [code,setCode]=useState("");
  const [name,setName]=useState("");
  const [sortOrder,setSortOrder]=useState(
    encounters.length
      ? Math.max(...encounters.map(e=>e.sort_order))+1
      : 1,
  );
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function add(e:React.FormEvent) {
    e.preventDefault();
    if(busy)return;

    setBusy(true);
    setMessage("");

    const r=await fetch(`/api/admin/raids/${raidId}/encounters`,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({code,name,sortOrder}),
    });
    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      setCode("");
      setName("");
      setSortOrder(v=>v+1);
      router.refresh();
    } else {
      setMessage(j.message??j.error??"Could not add encounter.");
    }

    setBusy(false);
  }

  return <div className="stack">
    <div className="stack">
      {encounters.length===0&&
        <div className="card muted">No encounters configured yet.</div>
      }

      {encounters.map(e=>
        <EncounterRow key={e.id} raidId={raidId} encounter={e}/>
      )}
    </div>

    <form className="card form stack" onSubmit={add}>
      <h3 style={{margin:0}}>Add encounter</h3>

      <div className="admin-form-grid">
        <label>
          Code
          <input
            value={code}
            onChange={e=>setCode(e.target.value)}
            placeholder="22-1"
            required
          />
        </label>

        <label>
          Name
          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="Dungeon name"
            required
          />
        </label>

        <label>
          Order
          <input
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={e=>setSortOrder(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="row">
        <button className="btn primary" disabled={busy}>
          {busy?"Adding…":"Add encounter"}
        </button>
        {message&&<span className="error">{message}</span>}
      </div>
    </form>
  </div>;
}
