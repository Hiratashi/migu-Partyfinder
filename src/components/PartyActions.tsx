"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const labels:Record<string,string>={complete:"complete the party",cancel:"cancel the party",leave:"leave the party"};

export default function PartyActions({partyId,isLeader,isMember,status}:{partyId:string;isLeader:boolean;isMember:boolean;status:string}){
  const router=useRouter();
  const [busy,setBusy]=useState<string|null>(null);
  const [msg,setMsg]=useState('');

  async function action(name:'complete'|'cancel'|'leave',confirmText:string){
    if(!window.confirm(confirmText))return;
    setBusy(name);setMsg('');
    try{
      const r=await fetch(`/api/parties/${partyId}/${name}`,{method:'POST',headers:{'accept':'application/json'}});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){setMsg(j.message??j.error??`Could not ${labels[name]}.`);return;}
      if(name==='complete'||name==='cancel')router.push('/history');else router.push('/my-parties');
      router.refresh();
    }catch{
      setMsg(`Could not ${labels[name]}. Please try again.`);
    }finally{setBusy(null);}
  }

  if(!['OPEN','FULL'].includes(status))return null;
  return <div className="stack">
    <div className="row">{isLeader?<>
      <Link className="btn" href={`/parties/${partyId}/edit`}>Edit party</Link>
      <button type="button" className="btn" disabled={busy!==null} onClick={()=>action('complete','Mark this run as completed?')}>{busy==='complete'?'Completing…':'Mark completed'}</button>
      <button type="button" className="btn danger" disabled={busy!==null} onClick={()=>action('cancel','Cancel this party?')}>{busy==='cancel'?'Cancelling…':'Cancel party'}</button>
    </>:isMember?<button type="button" className="btn danger" disabled={busy!==null} onClick={()=>action('leave','Leave this party?')}>{busy==='leave'?'Leaving…':'Leave party'}</button>:null}</div>
    {msg&&<span className="error" role="alert">{msg}</span>}
  </div>;
}
