"use client";

import { useState } from "react";
import ClassIcon from "@/components/ClassIcon";
import MatchInviteButton from "@/components/MatchInviteButton";
import PlayerProfileHover from "@/components/PlayerProfileHover";

type Capability={
  id:string;
  name:string;
  raid_id:string|null;
};

type Character={
  id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
  armor_type:"TENEBROUS"|"EXASCALE"|null;
  exascale_color:"RED"|"BLUE"|"GREEN"|null;
  capabilities:Capability[];
};

export default function AvailablePlayerInviteCard({
  partyId,
  raidId,
  userId,
  display,
  username,
  notes,
  characters,
}:{
  partyId:string;
  raidId:string;
  userId:string;
  display:string;
  username:string;
  notes:string|null;
  characters:Character[];
}) {
  const [preferred,setPreferred]=useState<string[]>([]);

  function toggle(characterId:string) {
    setPreferred(current=>
      current.includes(characterId)
        ? current.filter(id=>id!==characterId)
        : [...current,characterId],
    );
  }

  return <article className="card stack">
    <div>
      <PlayerProfileHover
        userId={userId}
        display={display}
        username={username}
        raidId={raidId}
      />
    </div>

    <div className="available-player-preference-help muted">
      Optional: select one or more characters you would prefer for this party.
      The player can still join with any eligible character.
    </div>

    <div className="available-player-character-list">
      {characters.map(character=>{
        const selected=preferred.includes(character.id);

        return <button
          type="button"
          className={`available-player-character available-player-character-selectable ${
            selected?"preferred-selected":""
          }`}
          key={character.id}
          aria-pressed={selected}
          onClick={()=>toggle(character.id)}
        >
          <ClassIcon
            src={character.icon_path}
            abbreviation={character.abbreviation}
            name={character.name}
          />

          <div className="available-player-character-copy">
            <strong>{character.name}</strong>

            <div className="muted">
              {character.abbreviation} &middot; {character.damage_type} &middot; {character.role}
            </div>

            {character.armor_type&&
              <div className="available-player-character-capabilities">
                <span className="public-character-capability-tag">
                  {character.armor_type==="TENEBROUS"
                    ? "Tenebrous"
                    : `Exascale - ${
                        character.exascale_color
                          ? character.exascale_color[0]+
                            character.exascale_color.slice(1).toLowerCase()
                          : ""
                      }`}
                </span>
              </div>
            }

            {(character.capabilities??[]).length>0&&
              <div className="available-player-character-capabilities">
                {character.capabilities.map(capability=>
                  <span
                    className="public-character-capability-tag"
                    key={capability.id}
                  >
                    {capability.name}
                  </span>
                )}
              </div>
            }
          </div>

          {selected&&
            <span className="pill preferred-character-pill">
              Preferred
            </span>
          }
        </button>;
      })}
    </div>

    {preferred.length>0&&
      <span className="muted">
        {preferred.length} preferred character{preferred.length===1?"":"s"} selected.
      </span>
    }

    {notes&&<span>{notes}</span>}

    <MatchInviteButton
      partyId={partyId}
      userId={userId}
      preferredCharacterIds={preferred}
    />
  </article>;
}
