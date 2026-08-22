"use client";

import { useLayoutEffect, useRef, useState } from "react";
import ClassIcon from "@/components/ClassIcon";

type Character={
  id:string;
  character_name:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
};

type AvailabilityRow={
  day:string;
  ranges:string[];
};

type Preview={
  id:string;
  displayName:string;
  username:string;
  profileImageUrl:string|null;
  characters:Character[];
  availability:AvailabilityRow[];
};

export default function PlayerProfileHover({
  userId,
  display,
  username,
  raidId,
}:{
  userId:string;
  display:string;
  username:string;
  raidId?:string;
}) {
  const wrapperRef=useRef<HTMLSpanElement>(null);
  const cardRef=useRef<HTMLSpanElement>(null);
  const hideTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);

  const [open,setOpen]=useState(false);
  const [placement,setPlacement]=useState<"below"|"above">("below");
  const [preview,setPreview]=useState<Preview|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function load() {
    if(preview||loading)return;

    setLoading(true);
    setError("");

    try {
      const timeZone=
        Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";

      const params=new URLSearchParams({
        timezone:timeZone,
      });

      if(raidId) {
        params.set("raidId",raidId);
      }

      const response=await fetch(
        `/api/players/${encodeURIComponent(userId)}/preview?${params.toString()}`,
        {
          method:"GET",
          cache:"no-store",
        },
      );

      const data=await response.json().catch(()=>({}));

      if(!response.ok) {
        setError("Could not load profile.");
        return;
      }

      setPreview(data as Preview);
    } catch {
      setError("Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  function cancelHide() {
    if(hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current=null;
    }
  }

  function show() {
    cancelHide();
    setOpen(true);
    void load();
  }

  function hide() {
    cancelHide();
    setOpen(false);
  }

  function scheduleHide() {
    cancelHide();
    hideTimerRef.current=setTimeout(()=>{
      setOpen(false);
      hideTimerRef.current=null;
    },180);
  }

  useLayoutEffect(()=>{
    if(!open)return;

    function updatePlacement() {
      const wrapper=wrapperRef.current;
      const card=cardRef.current;

      if(!wrapper||!card)return;

      const triggerRect=wrapper.getBoundingClientRect();
      const cardRect=card.getBoundingClientRect();

      const viewportHeight=window.innerHeight;
      const gap=10;
      const safeMargin=16;

      const roomBelow=
        viewportHeight-triggerRect.bottom-safeMargin;
      const roomAbove=
        triggerRect.top-safeMargin;

      const needed=Math.min(
        card.scrollHeight,
        Math.floor(viewportHeight*0.72),
      )+gap;

      if(roomBelow>=needed) {
        setPlacement("below");
      } else if(roomAbove>=needed) {
        setPlacement("above");
      } else {
        setPlacement(
          roomAbove>roomBelow
            ? "above"
            : "below",
        );
      }
    }

    updatePlacement();

    window.addEventListener("resize",updatePlacement);
    window.addEventListener("scroll",updatePlacement,true);

    return ()=>{
      window.removeEventListener("resize",updatePlacement);
      window.removeEventListener("scroll",updatePlacement,true);
    };
  },[open,preview,loading,error]);

  const name=preview?.displayName??display;
  const handle=preview?.username??username;
  const initial=(name.trim()[0]??handle.trim()[0]??"?").toUpperCase();

  return <span
    ref={wrapperRef}
    className="player-hover"
    onMouseEnter={show}
    onMouseLeave={scheduleHide}
    onFocus={show}
    onBlur={e=>{
      if(!e.currentTarget.contains(e.relatedTarget as Node|null)) {
        hide();
      }
    }}
  >
    <button
      type="button"
      className="player-hover-trigger"
      aria-expanded={open}
      onClick={()=>{
        if(open) {
          hide();
        } else {
          show();
        }
      }}
    >
      <strong>{display}</strong>{" "}
      <span className="muted">@{username}</span>
    </button>

    {open&&
      <span
        ref={cardRef}
        className={`player-hover-card card player-hover-card-${placement}`}
        role="dialog"
        aria-label={`${display} player profile preview`}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
      >
        {loading&&
          <span className="muted">
            Loading profile...
          </span>
        }

        {error&&
          <>
            <span className="error">{error}</span>
            <a
              className="btn"
              href={`/players/${encodeURIComponent(userId)}`}
            >
              View profile
            </a>
          </>
        }

        {!loading&&!error&&preview&&<>
          <span className="player-hover-header">
            {preview.profileImageUrl
              ? <img
                  className="player-hover-avatar"
                  src={preview.profileImageUrl}
                  alt=""
                />
              : <span
                  className="player-hover-avatar player-hover-avatar-fallback"
                  aria-hidden="true"
                >
                  {initial}
                </span>
            }

            <span className="player-hover-identity">
              <strong>{name}</strong>
              <span className="muted">@{handle}</span>
            </span>
          </span>

          <span className="player-hover-section">
            <span className="eyebrow">Characters</span>

            {preview.characters.length===0
              ? <span className="muted">
                  No active characters.
                </span>
              : <span className="player-hover-characters">
                  {preview.characters.map(character=>
                    <span
                      className="player-hover-character"
                      key={character.id}
                    >
                      <ClassIcon
                        src={character.icon_path}
                        abbreviation={character.abbreviation}
                        name={character.name}
                      />

                      <span>
                        <strong>{character.character_name}</strong>
                        <span className="muted">
                          {character.abbreviation} · {character.damage_type} · {character.role}
                        </span>
                      </span>
                    </span>
                  )}
                </span>
            }
          </span>

          <span className="player-hover-section">
            <span className="eyebrow">Availability</span>

            {preview.availability.length===0
              ? <span className="muted">
                  No weekly availability saved.
                </span>
              : <span className="player-hover-availability">
                  {preview.availability.map(row=>
                    <span
                      className="player-hover-availability-row"
                      key={row.day}
                    >
                      <strong>{row.day.slice(0,3)}</strong>
                      <span>
                        {row.ranges.join(", ")}
                      </span>
                    </span>
                  )}
                </span>
            }
          </span>

          <a
            className="btn primary player-hover-profile-link"
            href={`/players/${encodeURIComponent(userId)}`}
          >
            View full profile
          </a>
        </>}
      </span>
    }
  </span>;
}
