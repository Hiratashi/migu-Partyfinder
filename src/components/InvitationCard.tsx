import LocalDateTime from "./LocalDateTime";
import InvitationActions from "./InvitationActions";

export default function InvitationCard({
  party,
  returnTo="/",
}:{
  party:{id:string;leader:string;encounters:string;start:string};
  returnTo?:string;
}) {
  return <div className="card stack">
    <strong>Raid invitation from {party.leader}</strong>
    <span>
      {party.encounters} - <LocalDateTime iso={party.start}/>
    </span>
    <p className="muted">
      Open the party to review the run, current members and requested
      composition before choosing a character.
    </p>
    <InvitationActions partyId={party.id} returnTo={returnTo}/>
  </div>;
}
