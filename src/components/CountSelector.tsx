"use client";
export default function CountSelector({label,value,max,onChange}:{label:string;value:number;max:number;onChange:(v:number)=>void}){
  return <div className="need-selector"><strong>{label}</strong><div className="count-buttons">{Array.from({length:max+1},(_,i)=><button type="button" key={i} className={`count-btn ${value===i?'selected':''}`} onClick={()=>onChange(i)}>{i}</button>)}</div></div>;
}
