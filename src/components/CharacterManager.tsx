"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";

type ClassOption={
  id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
};

type CharacterRow={
  id:string;
  character_name:string;
  class_id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
};

export default function CharacterManager({
  character,
  classes,
}:{
  character:CharacterRow;
  classes:ClassOption[];
}) {
  const router=useRouter();
  const [editing,setEditing]=useState(false);
  const [name,setName]=useState(character.character_name);
  const [classId,setClassId]=useState(character.class_id);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [confirmOpen,setConfirmOpen]=useState(false);

  async function save() {
    if(busy)return;
    setBusy(true);
    setMessage("");

    const r=await fetch(`/api/profile/characters/${character.id}`,{
      method:"PATCH",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        characterName:name,
        classId,
      }),
    });
    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      setEditing(false);
      router.refresh();
    } else {
      setMessage(
        j.message??
        j.issues?.[0]?.message??
        j.error??
        "Could not update character.",
      );
    }

    setBusy(false);
  }

  async function remove() {
    if(busy)return;
    setBusy(true);
    setMessage("");

    const r=await fetch(`/api/profile/characters/${character.id}`,{
      method:"DELETE",
      headers:{"accept":"application/json"},
    });
    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      setConfirmOpen(false);
      router.refresh();
      return;
    }

    setConfirmOpen(false);
    setBusy(false);
    setMessage(
      j.message??
      j.error??
      "Could not remove character.",
    );
  }

  if(editing) {
    return <article className="card stack">
      <div className="row">
        <div className="classicon">{character.abbreviation}</div>
        <strong>Edit character</strong>
      </div>

      <label className="form">
        Character name
        <input
          value={name}
          onChange={e=>setName(e.target.value)}
          minLength={2}
          maxLength={32}
          required
        />
      </label>

      <label className="form">
        Class
        <select value={classId} onChange={e=>setClassId(e.target.value)}>
          {classes.map(c=>
            <option key={c.id} value={c.id}>
              {c.name} ({c.abbreviation}) - {c.damage_type} {c.role}
            </option>
          )}
        </select>
      </label>

      <div className="row">
        <button
          type="button"
          className="btn primary"
          onClick={save}
          disabled={busy}
        >
          {busy?"Saving…":"Save"}
        </button>

        <button
          type="button"
          className="btn"
          onClick={()=>{
            setName(character.character_name);
            setClassId(character.class_id);
            setMessage("");
            setEditing(false);
          }}
          disabled={busy}
        >
          Cancel
        </button>
      </div>

      {message&&<span className="error" role="alert">{message}</span>}
    </article>;
  }

  return <>
    <article className="card stack">
      <div className="row between">
        <div className="row">
          <div className="classicon">{character.abbreviation}</div>
          <div>
            <strong>{character.character_name}</strong>
            <div className="muted">
              {character.name} · {character.damage_type} · {character.role}
            </div>
          </div>
        </div>

        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={()=>setEditing(true)}
          >
            Edit
          </button>

          <button
            type="button"
            className="btn danger-subtle"
            onClick={()=>setConfirmOpen(true)}
          >
            Remove
          </button>
        </div>
      </div>

      {message&&<span className="error" role="alert">{message}</span>}
    </article>

    <AdminConfirmDialog
      open={confirmOpen}
      title={`Remove ${character.character_name}?`}
      message="This permanently removes the character from your profile and availability selections. Removal is blocked if a party record currently references this character."
      confirmLabel="Remove character"
      busy={busy}
      onCancel={()=>setConfirmOpen(false)}
      onConfirm={remove}
    />
  </>;
}
