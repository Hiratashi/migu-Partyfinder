"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminConfirmDialog from "./AdminConfirmDialog";

export default function DeleteCapabilityButton({
  capabilityId,
  capabilityName,
}:{
  capabilityId:string;
  capabilityName:string;
}) {
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function remove() {
    setBusy(true);
    setMessage("");

    const response=await fetch(
      `/api/admin/capabilities/${capabilityId}`,
      {
        method:"DELETE",
        headers:{"accept":"application/json"},
      },
    );
    const data=await response.json().catch(()=>({}));

    if(response.ok) {
      router.push("/admin/capabilities");
      router.refresh();
      return;
    }

    setOpen(false);
    setBusy(false);
    setMessage(
      data.message??
      data.error??
      "Could not delete capability.",
    );
  }

  return <div className="stack">
    <button
      type="button"
      className="btn danger-subtle"
      onClick={()=>setOpen(true)}
      disabled={busy}
    >
      Delete capability
    </button>

    {message&&<span className="error" role="alert">{message}</span>}

    <AdminConfirmDialog
      open={open}
      title={`Delete ${capabilityName}?`}
      message="This permanently removes the capability definition. Deletion is blocked while any character uses it; deactivate it instead in that case."
      confirmLabel="Delete capability"
      busy={busy}
      onCancel={()=>setOpen(false)}
      onConfirm={remove}
    />
  </div>;
}
