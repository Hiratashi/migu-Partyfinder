"use client";

import { useState } from "react";

type ArmorType="TENEBROUS"|"EXASCALE"|null;
type ExascaleColor="RED"|"BLUE"|"GREEN"|null;

export default function CharacterArmorSetup({
  characterId,
  initialArmorType,
  initialExascaleColor,
  onSaved,
}:{
  characterId:string;
  initialArmorType:ArmorType;
  initialExascaleColor:ExascaleColor;
  onSaved?:(armorType:ArmorType,exascaleColor:ExascaleColor)=>void;
}) {
  const [armorType,setArmorType]=useState<ArmorType>(initialArmorType);
  const [exascaleColor,setExascaleColor]=useState<ExascaleColor>(
    initialExascaleColor,
  );
  const [savedArmorType,setSavedArmorType]=useState<ArmorType>(
    initialArmorType,
  );
  const [savedExascaleColor,setSavedExascaleColor]=
    useState<ExascaleColor>(initialExascaleColor);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const dirty=
    armorType!==savedArmorType||
    exascaleColor!==savedExascaleColor;

  const valid=
    armorType!=="EXASCALE"||
    exascaleColor!==null;

  function chooseArmor(next:ArmorType) {
    setArmorType(next);

    if(next!=="EXASCALE") {
      setExascaleColor(null);
    }

    setMessage("");
  }

  async function save() {
    if(busy||!dirty||!valid)return;

    setBusy(true);
    setMessage("");

    try {
      const response=await fetch(
        `/api/profile/characters/${characterId}/armor`,
        {
          method:"PUT",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({
            armorType,
            exascaleColor,
          }),
        },
      );

      const data=await response.json().catch(()=>({}));

      if(!response.ok) {
        setMessage(
          data.message??
          data.issues?.[0]?.message??
          data.error??
          "Could not save armor setup.",
        );
        return;
      }

      setSavedArmorType(armorType);
      setSavedExascaleColor(exascaleColor);

      // Tell the parent summary immediately after the DB save succeeds.
      onSaved?.(armorType,exascaleColor);

      setMessage("Saved");
    } catch {
      setMessage("Could not save armor setup. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="character-armor">
    <div className="character-armor-heading">
      <strong>Armor set</strong>
      <span className="muted">
        Tenebrous and Exascale are mutually exclusive.
      </span>
    </div>

    <div className="character-armor-options" role="radiogroup">
      {[
        {value:null,label:"Not specified"},
        {value:"TENEBROUS" as const,label:"Tenebrous"},
        {value:"EXASCALE" as const,label:"Exascale"},
      ].map(option=>
        <label
          className={`character-armor-option ${
            armorType===option.value?"selected":""
          }`}
          key={option.label}
        >
          <input
            type="radio"
            name={`armor-${characterId}`}
            checked={armorType===option.value}
            onChange={()=>chooseArmor(option.value)}
          />
          <span>{option.label}</span>
        </label>
      )}
    </div>

    {armorType==="EXASCALE"&&
      <div className="character-armor-colors">
        <div className="character-armor-subheading">
          Exascale color
        </div>

        <div className="character-armor-options" role="radiogroup">
          {(["RED","BLUE","GREEN"] as const).map(color=>
            <label
              className={`character-armor-option ${
                exascaleColor===color?"selected":""
              }`}
              key={color}
            >
              <input
                type="radio"
                name={`exascale-color-${characterId}`}
                checked={exascaleColor===color}
                onChange={()=>{
                  setExascaleColor(color);
                  setMessage("");
                }}
              />
              <span>
                {color[0]+color.slice(1).toLowerCase()}
              </span>
            </label>
          )}
        </div>

        {!exascaleColor&&
          <span className="muted">
            Choose one Exascale color before saving.
          </span>
        }
      </div>
    }

    <div className="row character-armor-save">
      <button
        type="button"
        className="btn"
        onClick={save}
        disabled={busy||!dirty||!valid}
      >
        {busy?"Saving...":"Save armor setup"}
      </button>

      {dirty&&
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={()=>{
            setArmorType(savedArmorType);
            setExascaleColor(savedExascaleColor);
            setMessage("");
          }}
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
