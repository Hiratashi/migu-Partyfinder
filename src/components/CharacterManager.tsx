"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import ClassIcon from "@/components/ClassIcon";
import CharacterCapabilities from "@/components/CharacterCapabilities";
import CharacterArmorSetup from "@/components/CharacterArmorSetup";

type ClassOption={
  id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path?:string|null;
  base_character?:string;
  path_number?:number;
};

type Capability={
  id:string;
  name:string;
  description:string;
  category:"DAMAGE"|"GEAR"|"UTILITY"|"OTHER";
  raid_id:string|null;
  raid_name:string|null;
  sort_order:number;
};

type ArmorType="TENEBROUS"|"EXASCALE"|null;
type ExascaleColor="RED"|"BLUE"|"GREEN"|null;

type CharacterRow={
  id:string;
  character_name:string;
  class_id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path?:string|null;
  armor_type:ArmorType;
  exascale_color:ExascaleColor;
};

function armorSummary(
  armorType:ArmorType,
  exascaleColor:ExascaleColor,
) {
  if(armorType==="TENEBROUS")return "Tenebrous";

  if(armorType==="EXASCALE") {
    const color=exascaleColor
      ? exascaleColor[0]+exascaleColor.slice(1).toLowerCase()
      : "Unspecified";

    return `Exascale - ${color}`;
  }

  return "Armor not specified";
}

export default function CharacterManager({
  character,
  classes,
  capabilities,
  selectedCapabilityIds,
}:{
  character:CharacterRow;
  classes:ClassOption[];
  capabilities:Capability[];
  selectedCapabilityIds:string[];
}) {
  const router=useRouter();

  const [editing,setEditing]=useState(false);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [name,setName]=useState(character.character_name);
  const [classId,setClassId]=useState(character.class_id);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [confirmOpen,setConfirmOpen]=useState(false);

  // These values drive the collapsed summary and are updated immediately
  // after successful child-component saves.
  const [summaryArmorType,setSummaryArmorType]=useState<ArmorType>(
    character.armor_type,
  );
  const [summaryExascaleColor,setSummaryExascaleColor]=
    useState<ExascaleColor>(character.exascale_color);
  const [summaryCapabilityIds,setSummaryCapabilityIds]=useState<string[]>(
    selectedCapabilityIds,
  );

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
    return <article className="card stack character-card character-card-edit">
      <div className="row">
        <ClassIcon
          src={character.icon_path}
          abbreviation={character.abbreviation}
          name={character.name}
        />
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
        <select
          value={classId}
          onChange={e=>setClassId(e.target.value)}
        >
          {classes.map(c=>
            <option key={c.id} value={c.id}>
              {c.base_character
                ? `${c.base_character} P${c.path_number} - `
                : ""}
              {c.name} ({c.abbreviation}) - {c.damage_type} {c.role}
            </option>
          )}
        </select>
      </label>

      <div className="row character-card-actions">
        <button
          type="button"
          className="btn primary"
          onClick={save}
          disabled={busy}
        >
          {busy?"Saving...":"Save"}
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

      {message&&
        <span className="error character-card-message" role="alert">
          {message}
        </span>
      }
    </article>;
  }

  return <>
    <article
      className={`card character-card character-card-collapsible ${
        detailsOpen?"character-card-details-open":""
      }`}
    >
      <div className="character-card-main">
        <ClassIcon
          src={character.icon_path}
          abbreviation={character.abbreviation}
          name={character.name}
        />

        <div className="character-card-copy">
          <strong>{character.character_name}</strong>
          <div className="muted character-meta">
            {character.name} &middot; {character.damage_type} &middot; {character.role}
          </div>
        </div>
      </div>

      <div className="character-card-summary">
        <span className="character-card-summary-pill">
          {armorSummary(
            summaryArmorType,
            summaryExascaleColor,
          )}
        </span>

        <span className="character-card-summary-pill">
          {summaryCapabilityIds.length===0
            ? "No capabilities"
            : `${summaryCapabilityIds.length} ${
                summaryCapabilityIds.length===1
                  ? "capability"
                  : "capabilities"
              }`}
        </span>
      </div>

      <button
        type="button"
        className="btn character-card-details-toggle"
        aria-expanded={detailsOpen}
        aria-controls={`character-details-${character.id}`}
        onClick={()=>setDetailsOpen(value=>!value)}
      >
        {detailsOpen?"Hide details":"Manage details"}
      </button>

      {detailsOpen&&
        <div
          className="character-card-details"
          id={`character-details-${character.id}`}
        >
          <CharacterArmorSetup
            characterId={character.id}
            initialArmorType={summaryArmorType}
            initialExascaleColor={summaryExascaleColor}
            onSaved={(armorType,exascaleColor)=>{
              setSummaryArmorType(armorType);
              setSummaryExascaleColor(exascaleColor);
            }}
          />

          <CharacterCapabilities
            characterId={character.id}
            capabilities={capabilities}
            initialSelectedIds={summaryCapabilityIds}
            onSaved={setSummaryCapabilityIds}
          />
        </div>
      }

      <div className="row character-card-actions">
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

      {message&&
        <span className="error character-card-message" role="alert">
          {message}
        </span>
      }
    </article>

    <AdminConfirmDialog
      open={confirmOpen}
      title={`Remove ${character.character_name}?`}
      message="This removes the character from your profile and future availability, while completed party history keeps the original character record. Removal is blocked only while the character is selected in an active party."
      confirmLabel="Remove character"
      busy={busy}
      onCancel={()=>setConfirmOpen(false)}
      onConfirm={remove}
    />
  </>;
}
