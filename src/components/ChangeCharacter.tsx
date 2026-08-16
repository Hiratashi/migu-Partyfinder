"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Char={id:string;character_name:string;abbreviation:string;damage_type:string;role:string;eligible:boolean;reason?:string};
export default function ChangeCharacter({partyId,currentCharacterId,characters}:{partyId:string;currentCharacterId:string|null;characters:Char[]}){
  const router=useRouter();const [open,setOpen]=useState(false);const [characterId,setCharacterId]=useState(currentCharacterId??characters.find(c=>c.eligible)?.id??"");const [msg,setMsg]=useState("");
  async function save(){if(!characterId)return;setMsg('Saving…');const r=await fetch(`/api/parties/${partyId}/members/me/character`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({characterId})});const j=await r.json().catch(()=>({}));if(r.ok){setMsg('');setOpen(false);router.refresh();}else setMsg(j.error==='character_not_needed'?'That character does not fit the currently enforced composition.':'Could not change character.');}
  if(!open)return <button className="btn" type="button" onClick={()=>setOpen(true)}>Change character</button>;
  return <div className="row"><select value={characterId} onChange={e=>setCharacterId(e.target.value)} style={{padding:9,borderRadius:9,background:'#10131a',color:'white'}}>{characters.map(c=><option key={c.id} value={c.id} disabled={!c.eligible}>{c.character_name} — {c.abbreviation} ({c.damage_type} {c.role}){!c.eligible?` — ${c.reason??'not currently needed'}`:''}</option>)}</select><button className="btn primary" type="button" onClick={save}>Save</button><button className="btn" type="button" onClick={()=>setOpen(false)}>Cancel</button>{msg&&<span className="error">{msg}</span>}</div>;
}
