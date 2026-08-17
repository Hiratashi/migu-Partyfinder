"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminConfirmDialog from "./AdminConfirmDialog";

export default function DeleteClassButton({
  classId,
  className,
}:{
  classId:string;
  className:string;
}) {
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function remove() {
    setBusy(true);
    setMessage("");

    const r=await fetch(`/api/admin/classes/${classId}`,{
      method:"DELETE",
      headers:{"accept":"application/json"},
    });
    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      router.push("/admin/classes");
      router.refresh();
      return;
    }

    setOpen(false);
    setBusy(false);
    setMessage(
      j.message??
      j.error??
      "Could not delete class.",
    );
  }

  return <div className="stack">
    <button
      type="button"
      className="btn danger-subtle"
      onClick={()=>setOpen(true)}
      disabled={busy}
    >
      Delete class
    </button>

    {message&&<span className="error" role="alert">{message}</span>}

    <AdminConfirmDialog
      open={open}
      title={`Delete ${className}?`}
      message="This permanently removes the class. Deletion is blocked when any character uses this class; deactivate it instead in that case."
      confirmLabel="Delete class"
      busy={busy}
      onCancel={()=>setOpen(false)}
      onConfirm={remove}
    />
  </div>;
}
