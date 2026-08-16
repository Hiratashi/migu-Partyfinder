"use client";

import { useMemo, useState } from "react";

type E={id:string;code:string};
type C={
  id:string;
  character_name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
};
type Slot={day:number;minute:number};
type Initial={
  encounterIds:string[];
  characterIds:string[];
  stages:number[];
  practiceOk:boolean;
  notes:string;
  slots:Slot[];
};

const DAYS=[
  "Monday","Tuesday","Wednesday","Thursday",
  "Friday","Saturday","Sunday",
];
const MINUTES=Array.from({length:48},(_,i)=>i*30);
const key=(day:number,minute:number)=>`${day}:${minute}`;
const label=(minute:number)=>
  `${String(Math.floor(minute/60)).padStart(2,"0")}:${
    minute%60===0?"00":"30"
  }`;

export default function WeeklyAvailabilityForm({
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
  const [slots,setSlots]=useState<Set<string>>(
    ()=>new Set(
      (initial?.slots??[]).map(s=>key(s.day,s.minute)),
    ),
  );
  const [practiceOk,setPracticeOk]=useState(
    practiceSupported&&(initial?.practiceOk??true),
  );
  const [notes,setNotes]=useState(initial?.notes??"");
  const [dragValue,setDragValue]=useState<boolean|null>(null);
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

  function setSlot(day:number,minute:number,value:boolean) {
    setSlots(prev=>{
      const next=new Set(prev);
      value
        ? next.add(key(day,minute))
        : next.delete(key(day,minute));
      return next;
    });
  }

  function startDrag(day:number,minute:number) {
    const value=!slots.has(key(day,minute));
    setDragValue(value);
    setSlot(day,minute,value);
  }

  function dragOver(
    day:number,
    minute:number,
    e:React.PointerEvent,
  ) {
    if(dragValue!==null&&e.buttons===1) {
      setSlot(day,minute,dragValue);
    }
  }

  function toggleDay(day:number) {
    const hasAll=MINUTES.every(m=>slots.has(key(day,m)));
    setSlots(prev=>{
      const next=new Set(prev);
      for(const m of MINUTES) {
        hasAll
          ? next.delete(key(day,m))
          : next.add(key(day,m));
      }
      return next;
    });
  }

  async function save() {
    if(
      !selectedEncounters.length||
      !selectedCharacters.length||
      !stages.length
    ) {
      setMsg("Select at least one fight, character, and stage.");
      return;
    }

    const timezone=
      Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";

    const weeklySlots=[...slots].map(v=>{
      const [day,minute]=v.split(":").map(Number);
      return {day,minute};
    });

    setMsg("Saving…");

    const r=await fetch("/api/availability",{
      method:"PUT",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        raidSlug,
        encounters:selectedEncounters,
        characterIds:selectedCharacters,
        stages,
        practiceOk:practiceSupported?practiceOk:false,
        timezone,
        slots:weeklySlots,
        notes,
      }),
    });

    const j=await r.json().catch(()=>({}));

    setMsg(
      r.ok
        ? `${raidName} availability saved.`
        : (
            j.message??
            j.issues?.[0]?.message??
            j.error??
            "Could not save availability"
          ),
    );
  }

  return <div className="stack">
    <section className="card stack">
      <div className="row between">
        <div>
          <h2 style={{margin:0}}>Weekly availability</h2>
          <p className="muted" style={{marginBottom:0}}>
            Set this once and edit it whenever your usual schedule changes.
            Times use your browser timezone.
          </p>
        </div>
        <span className="pill">
          {Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"}
        </span>
      </div>

      <div
        className="weekly-scroll"
        onPointerUp={()=>setDragValue(null)}
        onPointerLeave={()=>setDragValue(null)}
      >
        <div className="weekly-grid">
          <div className="weekly-corner">Day</div>
          {MINUTES.map(m=>
            <div className="weekly-time" key={m}>
              {m%120===0?label(m):""}
            </div>
          )}

          {DAYS.map((day,di)=>
            <div className="weekly-row" key={day} style={{display:"contents"}}>
              <button
                type="button"
                className="weekly-day"
                onClick={()=>toggleDay(di)}
              >
                {day.slice(0,3)}
              </button>

              {MINUTES.map(m=>
                <button
                  type="button"
                  aria-label={`${day} ${label(m)}`}
                  title={`${day} ${label(m)}-${label((m+30)%1440)}`}
                  key={m}
                  className={
                    `weekly-cell ${
                      slots.has(key(di,m))?"selected":""
                    }`
                  }
                  onPointerDown={e=>{
                    e.preventDefault();
                    startDrag(di,m);
                  }}
                  onPointerEnter={e=>dragOver(di,m,e)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={()=>setSlots(new Set())}
        >
          Clear schedule
        </button>
        <span className="muted">
          Click or drag across 30-minute blocks. Click a day name to
          select or clear the whole day.
        </span>
      </div>
    </section>

    <section className="card stack">
      <h2 style={{margin:0}}>{raidName} preferences</h2>

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
        <div className="checks">
          {characters.map(c=>
            <label key={c.id}>
              <input
                type="checkbox"
                checked={selectedCharacters.includes(c.id)}
                onChange={()=>toggleArray(
                  c.id,
                  selectedCharacters,
                  setSelectedCharacters,
                )}
              />
              {c.character_name} ({c.abbreviation})
            </label>
          )}
        </div>
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

      <div className="row">
        <button type="button" className="btn primary" onClick={save}>
          Save availability
        </button>
        <span className={msg.includes("Could")?"error":"muted"}>
          {msg}
        </span>
      </div>
    </section>
  </div>;
}
