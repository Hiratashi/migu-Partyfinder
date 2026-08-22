"use client";

import { ChangeEvent, useRef, useState } from "react";

type Props={
  displayName:string;
  username:string;
  customImageUrl:string|null;
  discordAvatarUrl:string|null;
};

export default function ProfileIdentityCard({
  displayName,
  username,
  customImageUrl,
  discordAvatarUrl,
}:Props) {
  const inputRef=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [preview,setPreview]=useState(customImageUrl??discordAvatarUrl??null);
  const hasCustom=Boolean(customImageUrl);

  async function upload(file:File) {
    setBusy(true);
    setMsg("Uploading...");

    try {
      const form=new FormData();
      form.append("image",file);

      const response=await fetch("/api/profile/image",{
        method:"POST",
        body:form,
      });

      const data=await response.json().catch(()=>({}));

      if(!response.ok) {
        setMsg(
          data.message??
          data.error??
          "Could not upload profile picture.",
        );
        return;
      }

      setPreview(
        data.profileImageUrl??
        customImageUrl??
        discordAvatarUrl??
        null,
      );
      setMsg("Profile picture updated.");
      window.location.reload();
    } catch {
      setMsg("Could not upload profile picture.");
    } finally {
      setBusy(false);
      if(inputRef.current)inputRef.current.value="";
    }
  }

  async function onFileChange(e:ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0];
    if(!file)return;

    if(file.size>5*1024*1024) {
      setMsg("Profile pictures must be 5 MB or smaller.");
      e.target.value="";
      return;
    }

    await upload(file);
  }

  async function removeCustom() {
    setBusy(true);
    setMsg("Removing...");

    try {
      const response=await fetch("/api/profile/image",{
        method:"DELETE",
      });

      const data=await response.json().catch(()=>({}));

      if(!response.ok) {
        setMsg(
          data.message??
          data.error??
          "Could not remove profile picture.",
        );
        return;
      }

      setPreview(discordAvatarUrl);
      setMsg("Custom profile picture removed.");
      window.location.reload();
    } catch {
      setMsg("Could not remove profile picture.");
    } finally {
      setBusy(false);
    }
  }

  const initial=(displayName.trim()[0]??username.trim()[0]??"?").toUpperCase();

  return <section className="card profile-identity-card">
    <div className="profile-avatar-wrap">
      {preview
        ? <img
            className="profile-avatar"
            src={preview}
            alt={`${displayName} profile picture`}
          />
        : <div className="profile-avatar profile-avatar-fallback" aria-hidden="true">
            {initial}
          </div>
      }
    </div>

    <div className="profile-identity-copy">
      <div>
        <div className="eyebrow">Your profile</div>
        <h2>{displayName}</h2>
        <div className="muted">@{username}</div>
      </div>

      <p className="muted profile-image-help">
        Upload a custom profile picture or keep using your Discord avatar.
        JPEG, PNG, and WebP images up to 5 MB are supported.
      </p>

      <div className="row profile-image-actions">
        <input
          ref={inputRef}
          className="profile-image-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          disabled={busy}
        />

        <button
          type="button"
          className="btn primary"
          onClick={()=>inputRef.current?.click()}
          disabled={busy}
        >
          {hasCustom?"Change picture":"Upload picture"}
        </button>

        {hasCustom&&
          <button
            type="button"
            className="btn"
            onClick={removeCustom}
            disabled={busy}
          >
            Remove custom picture
          </button>
        }
      </div>

      {msg&&
        <div
          className={
            msg.includes("Could")||
            msg.includes("must be")
              ? "error"
              : "muted"
          }
          role="status"
        >
          {msg}
        </div>
      }
    </div>
  </section>;
}
