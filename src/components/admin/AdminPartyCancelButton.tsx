"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPartyCancelButton({
  partyId,
  leaderName,
}:{
  partyId:string;
  leaderName:string;
}) {
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function cancelParty() {
    setBusy(true);
    setError("");

    try {
      const r=await fetch(`/api/admin/parties/${partyId}/cancel`,{
        method:"POST",
        headers:{
          "content-type":"application/json",
        },
        body:JSON.stringify({
          reason:"Administrative moderation",
        }),
      });

      const body=await r.json().catch(()=>({}));

      if(!r.ok) {
        setError(
          body?.message||
          "Could not cancel this party."
        );
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not cancel this party.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button
      className="btn danger"
      type="button"
      onClick={()=>setOpen(true)}
    >
      Cancel party
    </button>

    {open&&
      <div
        className="admin-confirm-backdrop"
        role="presentation"
        onMouseDown={e=>{
          if(e.target===e.currentTarget&&!busy)setOpen(false);
        }}
      >
        <div
          className="card admin-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`cancel-party-${partyId}`}
        >
          <div>
            <div className="eyebrow">Party moderation</div>
            <h2 id={`cancel-party-${partyId}`}>
              Cancel this party?
            </h2>
            <p className="muted">
              This party is led by <strong>{leaderName}</strong>.
              Cancelling it removes it from active Partyfinder listings.
              Historical data is preserved.
            </p>
          </div>

          {error&&
            <p className="admin-confirm-error">{error}</p>
          }

          <div className="admin-confirm-actions">
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={()=>setOpen(false)}
            >
              Keep party
            </button>

            <button
              className="btn danger"
              type="button"
              disabled={busy}
              onClick={cancelParty}
            >
              {busy?"Cancelling...":"Cancel party"}
            </button>
          </div>
        </div>
      </div>
    }
  </>;
}
