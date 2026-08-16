"use client";import { useRouter } from "next/navigation";
export default function DeleteAvailabilityButton({id}:{id:string}){const router=useRouter();async function remove(){const r=await fetch(`/api/availability/${id}`,{method:'DELETE'});if(r.ok)router.refresh();}return <button className="btn" onClick={remove}>Remove</button>}
