"use client";

import { useMemo, useState } from "react";
import ClassIcon from "./ClassIcon";

type E={id:string;code:string};

type C={
  id:string;
  character_name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path?:string|null;
};

type Initial={
  enabled:boolean;
  encounterIds:string[];
  characterIds:string[];
  stages:number[];
  practiceOk:boolean;
  notes:string;
};

function shortDamage(value:string) {
  if(value==="PHYSICAL")return "PHY";
  if(value==="MAGICAL")return "MAG";
  if(value==="HYBRID")return "HYB";
  return value;
}

function shortRole(value:string) {
  if(value==="SUPPORT")return "SUP";
  if(value==="FLEX")return "FLEX";
  return value;
}

export default function RaidPreferencesForm({
  raidSlug,
  raidName,
  encounters,
  characters,
  supportedStages,
  defaultStage,
  practiceSupported,
  initial,
}:{
  raidSlug:string;
  raidName:string;
  encounters:E[];
  characters:C[];
  supportedStages:number[];
  defaultStage:number;
  practiceSupported:boolean;
  initial?:Initial;
}) {
  const allEncounterIds=useMemo(
    ()=>encounters.map(e=>e.id),
    [encounters],
  );

  const [enabled,setEnabled]=useState(initial?.enabled??true);

  const [selectedEncounters,setSelectedEncounters]=useState(
    initial?.encounterIds.length
      ? initial.encounterIds
      : allEncounterIds,
  );

  const [selectedCharacters,setSelectedCharacters]=useState(
    initial?.characterIds.length
      ? initial.characterIds
      : characters.map(c=>c.id),
  );

  const [stages,setStages]=useState<number[]>(
    initial?.stages.length
      ? initial.stages
      : [defaultStage],
  );

  const [practiceOk,setPracticeOk]=useState(
    practiceSupported&&(initial?.practiceOk??true),
  );

  const [notes,setNotes]=useState(initial?.notes??"");
  const [msg,setMsg]=useState("");

  const fullRun=
    selectedEncounters.length===allEncounterIds.length&&
    allEncounterIds.every(id=>selectedEncounters.includes(id));

  function toggleArray<T>(
    value:T,
    current:T[],
    setter:(v:T[])=>void,
  ) {
    setter(
      current.includes(value)
        ? current.filter(x=>x!==value)
        : [...current,value],
    );
  }

  async function save() {
    if(
      enabled&&(
        !selectedEncounters.length||
        !selectedCharacters.length||
        !stages.length
      )
    ) {
      setMsg("Select at least one fight, character, and stage.");
      return;
    }

    setMsg("Saving...");

    const r=await fetch("/api/raid-preferences",{
      method:"PUT",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        raidSlug,
        enabled,
        encounters:selectedEncounters,
        characterIds:selectedCharacters,
        stages,
        practiceOk:practiceSupported?practiceOk:false,
        notes,
      }),
    });

    const j=await r.json().catch(()=>({}));

    setMsg(
      r.ok
        ? (
            enabled
              ? `${raidName} preferences saved.`
              : `${raidName} disabled.`
          )
        : (
            j.message??
            j.issues?.[0]?.message??
            j.error??
            "Could not save raid preferences"
          ),
    );
  }

  return <section className="card stack">
    <div className="row between">
      <div>
        <h2 style={{margin:0}}>{raidName} preferences</h2>
        <p className="muted" style={{marginBottom:0}}>
          Choose whether you currently want to be considered for this raid.
        </p>
      </div>

      <button
        type="button"
        className={`choice-btn ${enabled?"selected":""}`}
        aria-pressed={enabled}
        onClick={()=>{
          setEnabled(v=>!v);
          setMsg("");
        }}
      >
        {enabled?"Raid enabled":"Raid disabled"}
      </button>
    </div>

    <fieldset
      disabled={!enabled}
      className="stack"
      style={{
        border:0,
        padding:0,
        margin:0,
        opacity:enabled?1:0.5,
      }}
    >
      <div>
        <div className="muted">Runs you can do</div>

        <div className="checks">
          <label>
            <input
              type="checkbox"
              checked={fullRun}
              onChange={()=>setSelectedEncounters(
                fullRun?[]:allEncounterIds,
              )}
            />
            <strong>Full Run</strong>
          </label>

          {encounters.map(e=>
            <label key={e.id}>
              <input
                type="checkbox"
                checked={selectedEncounters.includes(e.id)}
                onChange={()=>toggleArray(
                  e.id,
                  selectedEncounters,
                  setSelectedEncounters,
                )}
              />
              {e.code}
            </label>
          )}
        </div>
      </div>

      <div>
        <div className="muted">Characters you can bring</div>

        {characters.length
          ? <div className="availability-character-grid">
              {characters.map(c=>{
                const checked=selectedCharacters.includes(c.id);

                return <label
                  key={c.id}
                  className={`availability-character ${checked?"selected":""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={()=>toggleArray(
                      c.id,
                      selectedCharacters,
                      setSelectedCharacters,
                    )}
                  />

                  <ClassIcon
                    src={c.icon_path}
                    abbreviation={c.abbreviation}
                    name={c.character_name}
                  />

                  <span className="availability-character-copy">
                    <strong>{c.character_name}</strong>
                    <small>
                      {c.abbreviation}
                      {" \u00b7 "}
                      {shortDamage(c.damage_type)}
                      {" \u00b7 "}
                      {shortRole(c.role)}
                    </small>
                  </span>
                </label>;
              })}
            </div>
          : <div className="muted">
              Add at least one character in your profile before enabling
              raid participation.
            </div>
        }
      </div>

      <div>
        <div className="muted">Difficulty stages</div>

        <div className="choice-row">
          {supportedStages.map(stage=>
            <button
              type="button"
              key={stage}
              className={
                `choice-btn ${
                  stages.includes(stage)?"selected":""
                }`
              }
              onClick={()=>toggleArray(stage,stages,setStages)}
            >
              Stage {stage}
            </button>
          )}
        </div>

        <div className="muted small-note">
          Stage {defaultStage} is selected by default.
        </div>
      </div>

      {practiceSupported&&
        <label className="checks">
          <span>
            <input
              type="checkbox"
              checked={practiceOk}
              onChange={e=>setPracticeOk(e.target.checked)}
            />
            {" "}I am okay with practice groups
          </span>
        </label>
      }

      <label className="form">
        Optional note
        <input
          value={notes}
          onChange={e=>setNotes(e.target.value)}
          maxLength={250}
          placeholder="e.g. prefer support if possible"
        />
      </label>
    </fieldset>

    <div className="row">
      <button
        type="button"
        className="btn primary"
        onClick={save}
        disabled={enabled&&characters.length===0}
      >
        Save raid preferences
      </button>

      <span className={msg.includes("Could")?"error":"muted"}>
        {msg}
      </span>
    </div>
  </section>;
}
