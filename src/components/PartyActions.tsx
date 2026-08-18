"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmDialog from "./ConfirmDialog";

const labels:Record<string,string>={complete:"complete the party",cancel:"cancel the party",leave:"leave the party"};
type ActionName='complete'|'cancel'|'leave';

const dialogCopy:Record<ActionName,{title:string;message:string;confirm:string;danger:boolean}>={
  complete:{title:"Mark run completed?",message:"This moves the party out of the open list and into History.",confirm:"Mark completed",danger:false},
  cancel:{title:"Cancel this party?",message:"The party will be closed and shown as cancelled in History.",confirm:"Cancel party",danger:true},
  leave:{title:"Leave this party?",message:"You will be removed from the party and your slot becomes available again.",confirm:"Leave party",danger:true},
};

export default function PartyActions({partyId,isLeader,isMember,status}:{partyId:string;isLeader:boolean;isMember:boolean;status:string}){
  const router=useRouter();
  const [busy,setBusy]=useState<ActionName|null>(null);
  const [pending,setPending]=useState<ActionName|null>(null);
  const [msg,setMsg]=useState('');

  async function runAction(name:ActionName){
    setBusy(name);setMsg('');
    try{
      const r=await fetch(`/api/parties/${partyId}/${name}`,{method:'POST',headers:{'accept':'application/json'}});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){setMsg(j.message??j.error??`Could not ${labels[name]}.`);return;}
      setPending(null);
      if(name==='complete'||name==='cancel')router.push('/history');else router.push('/my-parties');
      router.refresh();
    }catch{
      setMsg(`Could not ${labels[name]}. Please try again.`);
    }finally{setBusy(null);}
  }

  if(!['OPEN','FULL'].includes(status))return null;
  const copy=pending?dialogCopy[pending]:null;
  return <div className="stack">
    <div className="row">{isLeader?<>
      <Link className="btn" href={`/parties/${partyId}/edit`}>Edit party</Link>
      <button type="button" className="btn" disabled={busy!==null} onClick={()=>setPending('complete')}>Mark completed</button>
      <button type="button" className="btn danger" disabled={busy!==null} onClick={()=>setPending('cancel')}>Cancel party</button>
    </>:isMember?<button type="button" className="btn danger" disabled={busy!==null} onClick={()=>setPending('leave')}>Leave party</button>:null}</div>
    {msg&&<span className="error" role="alert">{msg}</span>}
    {pending&&copy&&<ConfirmDialog open title={copy.title} message={copy.message} confirmLabel={copy.confirm} danger={copy.danger} busy={busy===pending} onConfirm={()=>runAction(pending)} onCancel={()=>!busy&&setPending(null)}/>} 
  </div>;
}
