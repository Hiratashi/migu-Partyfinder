"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CountSelector from "./CountSelector";
import DateTimeField from "./DateTimeField";

type E={id:string;code:string;name:string};

type Initial={
  title?:string;
  encounters:string[];
  startTime:string;
  endTime?:string|null;
  difficultyStage:number;
  isPractice:boolean;
  practiceEncounterIds?:string[];
  needPhysical:number;
  needMagical:number;
  needSupport:number;
  compositionRestricted?:boolean;
};

type Props={
  raidSlug:string;
  raidName:string;
  encounters:E[];
  partySize:number;
  supportedStages:number[];
  defaultStage:number;
  practiceSupported:boolean;
  partyId?:string;
  initial?:Initial;
};

export default function PartyForm({
  raidSlug,
  raidName,
  encounters,
  partySize,
  supportedStages,
  defaultStage,
  practiceSupported,
  partyId,
  initial,
}:Props) {
  const router=useRouter();
  const allIds=useMemo(()=>encounters.map(e=>e.id),[encounters]);
  const [selected,setSelected]=useState<string[]>(initial?.encounters??allIds);
  const [practice,setPractice]=useState(
    practiceSupported&&(initial?.isPractice??false),
  );
  const [practiceIds,setPracticeIds]=useState<string[]>(
    initial?.practiceEncounterIds??[],
  );
  const [range,setRange]=useState(Boolean(initial?.endTime));
  const [stage,setStage]=useState(
    initial?.difficultyStage??defaultStage,
  );
  const [physical,setPhysical]=useState(initial?.needPhysical??0);
  const [magical,setMagical]=useState(initial?.needMagical??0);
  const [support,setSupport]=useState(initial?.needSupport??0);
  const [restricted,setRestricted]=useState(
    initial?.compositionRestricted??true,
  );
  const [msg,setMsg]=useState("");

  const fullRun=
    selected.length===allIds.length&&
    allIds.every(id=>selected.includes(id));

  const totalRequested=physical+magical+support;

  function toggleEncounter(id:string) {
    setSelected(v=>{
      const next=v.includes(id)
        ? v.filter(x=>x!==id)
        : [...v,id];
      setPracticeIds(p=>p.filter(x=>next.includes(x)));
      return next;
    });
  }

  function togglePractice(id:string) {
    setPracticeIds(v=>
      v.includes(id)?v.filter(x=>x!==id):[...v,id],
    );
  }

  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");

    if(!selected.length) {
      setMsg("Select at least one fight.");
      return;
    }
    if(practice&&!practiceIds.length) {
      setMsg("Select at least one fight to practice.");
      return;
    }
    if(totalRequested>partySize) {
      setMsg(`Requested composition cannot exceed ${partySize} players.`);
      return;
    }
    if(!supportedStages.includes(stage)) {
      setMsg(`Stage ${stage} is not supported by ${raidName}.`);
      return;
    }

    const f=new FormData(e.currentTarget);
    const start=new Date(String(f.get("start")));
    const end=range?new Date(String(f.get("end"))):null;

    if(Number.isNaN(start.getTime())) {
      setMsg("Choose a valid start time.");
      return;
    }
    if(start.getTime()<=Date.now()) {
      setMsg("The party start time must be in the future.");
      return;
    }
    if(end&&end<=start) {
      setMsg("The end time must be after the start time.");
      return;
    }

    const body={
      raidSlug,
      title:String(f.get("title")||""),
      encounters:selected,
      startTime:start.toISOString(),
      endTime:end?.toISOString()??null,
      difficultyStage:stage,
      isPractice:practiceSupported?practice:false,
      practiceEncounterIds:
        practiceSupported&&practice?practiceIds:[],
      needPhysical:physical,
      needMagical:magical,
      needSupport:support,
      compositionRestricted:restricted,
    };

    setMsg(partyId?"Saving…":"Creating…");

    const r=await fetch(
      partyId?`/api/parties/${partyId}`:"/api/parties",
      {
        method:partyId?"PATCH":"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(body),
      },
    );

    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      router.push(
        partyId?`/parties/${partyId}`:`/parties/${j.id}`,
      );
    } else {
      setMsg(
        j.message??
        j.issues?.[0]?.message??
        j.error??
        "Could not save party",
      );
    }
  }

  return <form onSubmit={submit} className="card form stack">
    <label>
      Optional title
      <input
        name="title"
        maxLength={80}
        defaultValue={initial?.title??""}
        placeholder={`${raidName} run`}
      />
    </label>

    <div>
      <div className="muted">Run</div>
      <div className="checks">
        <label>
          <input
            type="checkbox"
            checked={fullRun}
            onChange={()=>setSelected(fullRun?[]:allIds)}
          />
          <strong>Full Run</strong>
        </label>
        {encounters.map(x=>
          <label key={x.id}>
            <input
              type="checkbox"
              checked={selected.includes(x.id)}
              onChange={()=>toggleEncounter(x.id)}
            />
            {x.code}
          </label>
        )}
      </div>
    </div>

    <div>
      <div className="muted">Difficulty stage</div>
      <div className="choice-row">
        {supportedStages.map(s=>
          <button
            type="button"
            key={s}
            className={`choice-btn ${stage===s?"selected":""}`}
            onClick={()=>setStage(s)}
          >
            Stage {s}
          </button>
        )}
      </div>
    </div>

    {practiceSupported&&
      <div className="stack">
        <label className="checks">
          <span>
            <input
              type="checkbox"
              checked={practice}
              onChange={e=>{
                setPractice(e.target.checked);
                if(!e.target.checked)setPracticeIds([]);
              }}
            />
            {" "}Practice group
          </span>
        </label>

        {practice&&
          <div>
            <div className="muted">Fight(s) to practice</div>
            <div className="choice-row">
              {encounters
                .filter(x=>selected.includes(x.id))
                .map(x=>
                  <button
                    type="button"
                    key={x.id}
                    className={
                      `choice-btn ${
                        practiceIds.includes(x.id)?"selected":""
                      }`
                    }
                    onClick={()=>togglePractice(x.id)}
                  >
                    {x.code}
                  </button>
                )}
            </div>
          </div>
        }
      </div>
    }

    <div className="checks">
      <label>
        <input
          type="checkbox"
          checked={range}
          onChange={e=>setRange(e.target.checked)}
        />
        Use a time range
      </label>
    </div>

    <DateTimeField
      name="start"
      label={range?"Available from":"Start time"}
      initialIso={initial?.startTime}
    />

    {range&&
      <DateTimeField
        name="end"
        label="Available until"
        initialIso={initial?.endTime}
      />
    }

    <div>
      <h3>Requested party composition</h3>
      <p className="muted">
        These are the roles you want for this group. The total cannot
        exceed {raidName}'s configured {partySize}-player limit.
      </p>

      <div className="need-grid">
        <CountSelector
          label="Physical DPS"
          value={physical}
          max={Math.max(0,partySize-magical-support)}
          displayMax={partySize}
          onChange={setPhysical}
        />
        <CountSelector
          label="Magical DPS"
          value={magical}
          max={Math.max(0,partySize-physical-support)}
          displayMax={partySize}
          onChange={setMagical}
        />
        <CountSelector
          label="Support"
          value={support}
          max={Math.max(0,partySize-physical-magical)}
          displayMax={partySize}
          onChange={setSupport}
        />
      </div>

      <p className="muted">
        {totalRequested}/{partySize} composition slots requested.{" "}
        {partySize-totalRequested} slot
        {partySize-totalRequested===1?" is":"s are"} unrestricted.
      </p>
    </div>

    <label className="checks">
      <span>
        <input
          type="checkbox"
          checked={restricted}
          onChange={e=>setRestricted(e.target.checked)}
        />
        {" "}Enforce requested roles when players join or change character
      </span>
    </label>

    <p className="muted">
      Turn this off if your group agrees to use a different composition.
      You can also toggle it directly from the party page.
    </p>

    <div className="row">
      <button className="btn primary">
        {partyId?"Save changes":"Create party"}
      </button>
      <span className="error">{msg}</span>
    </div>
  </form>;
}
