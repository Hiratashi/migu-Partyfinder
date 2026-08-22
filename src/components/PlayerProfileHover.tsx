"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type Position={
  top:number;
  left:number;
  characterMaxHeight:number|null;
  emergencyScroll:boolean;
  mobile:boolean;
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
  const charactersRef=useRef<HTMLSpanElement>(null);
  const hideTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);

  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState<Position|null>(null);
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
    setPosition(null);
  }

  function scheduleHide() {
    cancelHide();
    hideTimerRef.current=setTimeout(()=>{
      setOpen(false);
      setPosition(null);
      hideTimerRef.current=null;
    },180);
  }

  useLayoutEffect(()=>{
    if(!open)return;

    function updatePosition() {
      const wrapper=wrapperRef.current;
      const card=cardRef.current;

      if(!wrapper||!card)return;

      const viewportWidth=window.innerWidth;
      const viewportHeight=window.innerHeight;
      const safeMargin=16;

      if(viewportWidth<=680) {
        setPosition({
          top:0,
          left:0,
          characterMaxHeight:null,
          emergencyScroll:false,
          mobile:true,
        });
        return;
      }

      const gap=14;
      const triggerRect=wrapper.getBoundingClientRect();
      const cardRect=card.getBoundingClientRect();
      const characters=charactersRef.current;

      const naturalCharacterHeight=
        characters?.scrollHeight??0;
      const visibleCharacterHeight=
        characters?.getBoundingClientRect().height??0;

      const nonCharacterHeight=Math.max(
        0,
        cardRect.height-visibleCharacterHeight,
      );

      const maxCardHeight=Math.max(
        240,
        viewportHeight-(safeMargin*2),
      );

      const availableForCharacters=Math.max(
        96,
        maxCardHeight-nonCharacterHeight,
      );

      const characterMaxHeight=characters
        ? Math.min(
            300,
            naturalCharacterHeight,
            availableForCharacters,
          )
        : null;

      const projectedHeight=
        nonCharacterHeight+
        (characterMaxHeight??0);

      const emergencyScroll=
        projectedHeight>maxCardHeight;

      const effectiveHeight=Math.min(
        projectedHeight,
        maxCardHeight,
      );

      const cardWidth=cardRect.width;

      const roomLeft=
        triggerRect.left-safeMargin-gap;
      const roomRight=
        viewportWidth-triggerRect.right-safeMargin-gap;

      const roomBelow=
        viewportHeight-triggerRect.bottom-safeMargin-gap;
      const roomAbove=
        triggerRect.top-safeMargin-gap;

      let top:number;
      let left:number;

      if(cardWidth<=roomRight) {
        // Preferred desktop placement: right of the hovered name.
        left=triggerRect.right+gap;
        top=
          triggerRect.top+
          (triggerRect.height/2)-
          (effectiveHeight/2);
      } else if(cardWidth<=roomLeft) {
        // If the right side does not fit, place it on the left.
        left=triggerRect.left-gap-cardWidth;
        top=
          triggerRect.top+
          (triggerRect.height/2)-
          (effectiveHeight/2);
      } else {
        // Narrow layouts fall back to above/below positioning.
        const maxLeft=Math.max(
          safeMargin,
          viewportWidth-safeMargin-cardWidth,
        );

        left=Math.min(
          Math.max(triggerRect.left,safeMargin),
          maxLeft,
        );

        if(effectiveHeight<=roomBelow) {
          top=triggerRect.bottom+gap;
        } else if(effectiveHeight<=roomAbove) {
          top=triggerRect.top-gap-effectiveHeight;
        } else {
          const preferredTop=
            roomBelow>=roomAbove
              ? triggerRect.bottom+gap
              : triggerRect.top-gap-effectiveHeight;

          top=Math.min(
            Math.max(preferredTop,safeMargin),
            Math.max(
              safeMargin,
              viewportHeight-safeMargin-effectiveHeight,
            ),
          );
        }
      }

      // Keep the hover inside the vertical viewport regardless of placement.
      top=Math.min(
        Math.max(top,safeMargin),
        Math.max(
          safeMargin,
          viewportHeight-safeMargin-effectiveHeight,
        ),
      );

      setPosition({
        top,
        left,
        characterMaxHeight,
        emergencyScroll,
        mobile:false,
      });
    }

    updatePosition();

    window.addEventListener("resize",updatePosition);
    window.addEventListener("scroll",updatePosition,true);

    return ()=>{
      window.removeEventListener("resize",updatePosition);
      window.removeEventListener("scroll",updatePosition,true);
    };
  },[open,preview,loading,error]);

  const name=preview?.displayName??display;
  const handle=preview?.username??username;
  const initial=(name.trim()[0]??handle.trim()[0]??"?").toUpperCase();

  const card=open&&typeof document!=="undefined"
    ? createPortal(
        <span
          ref={cardRef}
          className={[
            "player-hover-card",
            "card",
            "player-hover-fixed-v8",
            position?.mobile
              ? "player-hover-fixed-v8-mobile"
              : "",
            position?.emergencyScroll
              ? "player-hover-fixed-v8-emergency"
              : "",
            position
              ? ""
              : "player-hover-fixed-v8-positioning",
          ].filter(Boolean).join(" ")}
          style={
            position&&!position.mobile
              ? {
                  top:position.top,
                  left:position.left,
                }
              : undefined
          }
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
                : <span
                    ref={charactersRef}
                    className="player-hover-characters"
                    style={{
                      maxHeight:
                        position?.characterMaxHeight??undefined,
                    }}
                  >
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
                            {character.abbreviation} &middot; {character.damage_type} &middot; {character.role}
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
        </span>,
        document.body,
      )
    : null;

  return <span
    ref={wrapperRef}
    className="player-hover"
    onMouseEnter={show}
    onMouseLeave={scheduleHide}
    onFocus={show}
    onBlur={e=>{
      if(!e.currentTarget.contains(e.relatedTarget as Node|null)) {
        scheduleHide();
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

    {card}
  </span>;
}
