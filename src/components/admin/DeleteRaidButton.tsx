"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminConfirmDialog from "./AdminConfirmDialog";

export default function DeleteRaidButton({
  raidId,
  raidName,
}:{
  raidId:string;
  raidName:string;
}) {
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function remove() {
    setBusy(true);
    setMessage("");

    const r=await fetch(`/api/admin/raids/${raidId}`,{
      method:"DELETE",
      headers:{"accept":"application/json"},
    });
    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      router.push("/admin/raids");
      router.refresh();
      return;
    }

    setOpen(false);
    setBusy(false);
    setMessage(
      j.message??
      j.error??
      "Could not delete raid.",
    );
  }

  return <div className="stack">
    <button
      type="button"
      className="btn danger-subtle"
      onClick={()=>setOpen(true)}
      disabled={busy}
    >
      Delete raid
    </button>

    {message&&<span className="error" role="alert">{message}</span>}

    <AdminConfirmDialog
      open={open}
      title={`Delete ${raidName}?`}
      message="This permanently removes the raid and its unused encounter definitions. Deletion is blocked if any party or availability profile references this raid."
      confirmLabel="Delete raid"
      busy={busy}
      onCancel={()=>setOpen(false)}
      onConfirm={remove}
    />
  </div>;
}
