import Link from "next/link";
import LocalDateTime from "./LocalDateTime";

type Props={
  party:{
    id:string;
    title:string|null;
    raidName?:string|null;
    creator?:string|null;
    start:string;
    end?:string|null;
    encounters:string;
    difficultyStage:number;
    isPractice:boolean;
    status:string;
    joined:number;
    partySize:number;
    remainingPhysical:number;
    remainingMagical:number;
    remainingSupport:number;
    compositionRestricted?:boolean;
  };
  relation?:string;
  actionLabel?:string;
};

export default function PartyCard({
  party,
  relation,
  actionLabel,
}:Props) {
  const full=party.status==="FULL" || party.joined>=party.partySize;

  return <article className="card party-card stack">
    <div className="party-card-head">
      <div>
        <div className="eyebrow">{party.raidName??"Doom Aporia"}</div>
        <h3 className="party-card-title">
          {party.title||party.encounters}
        </h3>
      </div>

      <div className="row">
        {relation&&<span className="pill relation-pill">{relation}</span>}
        <span className={`pill ${full?"full-pill":""}`}>
          {full?"FULL":"OPEN"}
        </span>
        <span className="pill">
          {party.isPractice?"Practice":"Clear"}
        </span>
      </div>
    </div>

    {party.creator&&
      <div className="muted">
        Created by <strong>@{party.creator}</strong>
      </div>
    }

    <div className="party-summary-grid">
      <div>
        <span className="label">Run</span>
        <strong>{party.encounters}</strong>
      </div>
      <div>
        <span className="label">Stage</span>
        <strong>{party.difficultyStage}</strong>
      </div>
      <div>
        <span className="label">Players</span>
        <strong>{party.joined}/{party.partySize}</strong>
      </div>
      <div>
        <span className="label">When</span>
        <strong>
          <LocalDateTime iso={party.start}/>
          {party.end&&<> → <LocalDateTime iso={party.end} timeOnly/></>}
        </strong>
      </div>
    </div>

    <div className="party-needs">
      <span>Still wanted</span>
      <strong>
        {party.remainingPhysical} Physical ·{" "}
        {party.remainingMagical} Magical ·{" "}
        {party.remainingSupport} Support
      </strong>
      {typeof party.compositionRestricted==="boolean"&&
        <small className="muted">
          {party.compositionRestricted
            ? "Requested role matching is enforced"
            : "Any role is currently allowed"}
        </small>
      }
    </div>

    <Link className="btn party-card-action" href={`/parties/${party.id}`}>
      {actionLabel??(full?"View full party":"View party")}
    </Link>
  </article>;
}
