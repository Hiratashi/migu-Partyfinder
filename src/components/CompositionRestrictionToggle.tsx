"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CompositionRestrictionToggle({partyId,restricted}:{partyId:string;restricted:boolean}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function toggle(){setBusy(true);setError("");const r=await fetch(`/api/parties/${partyId}/composition`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({restricted:!restricted})});if(r.ok)router.refresh();else setError('Could not update role restriction.');setBusy(false);}
  return <div className="row"><span className={`pill ${restricted?'':'good'}`}>Role matching: {restricted?'Enforced':'Open'}</span><button className="btn" type="button" onClick={toggle} disabled={busy}>{restricted?'Allow any role':'Enforce requested roles'}</button>{error&&<span className="error">{error}</span>}</div>;
}
