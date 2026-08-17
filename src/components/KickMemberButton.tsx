"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";

export default function KickMemberButton({partyId,userId,name}:{partyId:string;userId:string;name:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [open,setOpen]=useState(false);
  const [msg,setMsg]=useState('');

  async function kick(){
    setBusy(true);setMsg('');
    try{
      const r=await fetch(`/api/parties/${partyId}/members/${userId}`,{method:'DELETE',headers:{'accept':'application/json'}});
      const j=await r.json().catch(()=>({}));
      if(r.ok){setOpen(false);router.refresh();}else setMsg(j.message??j.error??'Could not remove member.');
    }catch{setMsg('Could not remove member. Please try again.');}
    finally{setBusy(false);}
  }

  return <div className="row">
    <button type="button" className="btn danger compact" disabled={busy} onClick={()=>setOpen(true)}>Kick</button>
    {msg&&<span className="error" role="alert">{msg}</span>}
    <ConfirmDialog open={open} title={`Remove ${name}?`} message="They will be removed from the party and their slot becomes available again." confirmLabel="Remove player" danger busy={busy} onConfirm={kick} onCancel={()=>!busy&&setOpen(false)}/>
  </div>;
}
