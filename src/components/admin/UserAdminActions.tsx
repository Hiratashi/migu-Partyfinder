"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminConfirmDialog from "./AdminConfirmDialog";

export default function UserAdminActions({
  userId,
  displayName,
  isAdmin,
  accessDisabled,
  isSelf,
}:{
  userId:string;
  displayName:string;
  isAdmin:boolean;
  accessDisabled:boolean;
  isSelf:boolean;
}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [confirm,setConfirm]=useState<
    null|"disable"|"enable"|"promote"|"demote"
  >(null);

  async function run() {
    if(!confirm||busy)return;

    setBusy(true);
    setMessage("");

    const access=confirm==="disable"||confirm==="enable";
    const endpoint=access
      ? `/api/admin/users/${userId}/access`
      : `/api/admin/users/${userId}/admin`;

    const value=
      confirm==="disable"
        ? true
        : confirm==="enable"
          ? false
          : confirm==="promote";

    const body=access
      ? {disabled:value}
      : {isAdmin:value};

    const r=await fetch(endpoint,{
      method:"PATCH",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body),
    });

    const j=await r.json().catch(()=>({}));

    if(r.ok) {
      setConfirm(null);
      setBusy(false);
      router.refresh();
      return;
    }

    setConfirm(null);
    setBusy(false);
    setMessage(
      j.message??
      j.error??
      "Could not update user.",
    );
  }

  const actionText=
    confirm==="disable"
      ? {
          title:`Disable ${displayName}?`,
          text:"This immediately signs the user out and prevents future logins until access is enabled again.",
          label:"Disable access",
        }
      : confirm==="enable"
        ? {
            title:`Enable ${displayName}?`,
            text:"The user will be allowed to sign in again through Discord.",
            label:"Enable access",
          }
        : confirm==="promote"
          ? {
              title:`Make ${displayName} an admin?`,
              text:"Admins can manage raids, classes and users. Only promote people you trust with site administration.",
              label:"Make admin",
            }
          : {
              title:`Remove admin from ${displayName}?`,
              text:"The user will keep normal Partyfinder access but lose administration permissions.",
              label:"Remove admin",
            };

  return <div className="stack">
    <div className="row">
      {isAdmin
        ? <button
            type="button"
            className="btn"
            disabled={busy||isSelf}
            onClick={()=>setConfirm("demote")}
          >
            Remove admin
          </button>
        : <button
            type="button"
            className="btn"
            disabled={busy||accessDisabled}
            onClick={()=>setConfirm("promote")}
          >
            Make admin
          </button>
      }

      {accessDisabled
        ? <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={()=>setConfirm("enable")}
          >
            Enable access
          </button>
        : <button
            type="button"
            className="btn danger-subtle"
            disabled={busy||isSelf}
            onClick={()=>setConfirm("disable")}
          >
            Disable access
          </button>
      }
    </div>

    {isSelf&&
      <span className="muted small-note">
        You cannot disable or demote your own account here.
      </span>
    }

    {message&&
      <span className="error" role="alert">
        {message}
      </span>
    }

    <AdminConfirmDialog
      open={confirm!==null}
      title={actionText.title}
      message={actionText.text}
      confirmLabel={actionText.label}
      danger={confirm==="disable"||confirm==="demote"}
      busy={busy}
      onCancel={()=>setConfirm(null)}
      onConfirm={run}
    />
  </div>;
}
