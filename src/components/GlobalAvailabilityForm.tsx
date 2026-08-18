"use client";

import { useState } from "react";

type Slot={day:number;minute:number};

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

export default function GlobalAvailabilityForm({
  initialSlots,
}:{
  initialSlots:Slot[];
}) {
  const [slots,setSlots]=useState<Set<string>>(
    ()=>new Set(initialSlots.map(s=>key(s.day,s.minute))),
  );
  const [dragValue,setDragValue]=useState<boolean|null>(null);
  const [msg,setMsg]=useState("");

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
    const timezone=
      Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";

    const weeklySlots=[...slots].map(v=>{
      const [day,minute]=v.split(":").map(Number);
      return {day,minute};
    });

    setMsg("Saving...");

    const r=await fetch("/api/availability",{
      method:"PUT",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        timezone,
        slots:weeklySlots,
      }),
    });

    const j=await r.json().catch(()=>({}));

    setMsg(
      r.ok
        ? "Weekly availability saved."
        : (
            j.message??
            j.issues?.[0]?.message??
            j.error??
            "Could not save availability"
          ),
    );
  }

  const timezone=
    Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";

  return <section className="card stack">
    <div className="row between">
      <div>
        <h2 style={{margin:0}}>Weekly availability</h2>
        <p className="muted" style={{marginBottom:0}}>
          Set this once and edit it whenever your usual schedule changes.
          Times use your browser timezone.
        </p>
      </div>

      <span className="pill">{timezone}</span>
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

    <div className="row">
      <button type="button" className="btn primary" onClick={save}>
        Save weekly availability
      </button>

      <span className={msg.includes("Could")?"error":"muted"}>
        {msg}
      </span>
    </div>
  </section>;
}
