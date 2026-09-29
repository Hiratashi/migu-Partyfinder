"use client";
import { useState } from "react";

const presets=[
  {minutes:15,label:"15 min"},{minutes:30,label:"30 min"},
  {minutes:60,label:"1h"},{minutes:120,label:"2h"},
  {minutes:360,label:"6h"},
];

export default function ReminderTiming({minutes,onChange,disabled=false}:{
  minutes:string;onChange:(value:string)=>void;disabled?:boolean;
}) {
  const [manual,setManual]=useState(
    !presets.some(option=>String(option.minutes)===minutes),
  );
  const custom=manual||!presets.some(option=>String(option.minutes)===minutes);
  return <div className="reminder-timing">
    <div className="reminder-grid" role="group" aria-label="Reminder time before start">
      {presets.map(option=><button key={option.minutes} type="button" disabled={disabled}
        className={`choice-btn ${minutes===String(option.minutes)?"selected":""}`}
        aria-pressed={minutes===String(option.minutes)}
        onClick={()=>{setManual(false);onChange(String(option.minutes));}}>{option.label}</button>)}
      <button type="button" disabled={disabled} className={`choice-btn ${custom?"selected":""}`}
        aria-pressed={custom} onClick={()=>{setManual(true);if(!custom)onChange("45");}}>Custom</button>
    </div>
    {custom&&<label className="reminder-custom">Minutes before start
      <input type="number" min={1} max={10080} step={1} value={minutes}
        disabled={disabled} onChange={event=>onChange(event.target.value)}/>
    </label>}
  </div>;
}
