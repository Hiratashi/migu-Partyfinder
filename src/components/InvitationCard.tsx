import LocalDateTime from "./LocalDateTime";
import InvitationActions from "./InvitationActions";

export default function InvitationCard({
  party,
  returnTo="/",
}:{
  party:{
    id:string;
    leader:string;
    encounters:string;
    start:string;
    preferredCharacters?:string|null;
  };
  returnTo?:string;
}) {
  return <div className="card stack">
    <strong>Raid invitation from {party.leader}</strong>
    <span>
      {party.encounters} - <LocalDateTime iso={party.start}/>
    </span>

    {party.preferredCharacters&&
      <div className="preferred-character-notice">
        <strong>Party lead prefers: {party.preferredCharacters}</strong>
        <span className="muted">
          This is only a preference. You can still choose any eligible character.
        </span>
      </div>
    }

    <p className="muted">
      Open the party to review the run, current members and requested
      composition before choosing a character.
    </p>
    <InvitationActions partyId={party.id} returnTo={returnTo}/>
  </div>;
}
