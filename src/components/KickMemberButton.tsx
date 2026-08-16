"use client";
import { useState } from "react";import { useRouter } from "next/navigation";
export default function KickMemberButton({partyId,userId,name}:{partyId:string;userId:string;name:string}){const router=useRouter();const [busy,setBusy]=useState(false);async function kick(){if(!confirm(`Remove ${name} from the party?`))return;setBusy(true);const r=await fetch(`/api/parties/${partyId}/members/${userId}`,{method:'DELETE'});setBusy(false);if(r.ok)router.refresh();else alert('Could not remove member.');}return <button className="btn" disabled={busy} onClick={kick}>Kick</button>}
