import Link from "next/link";
import LocalDateTime from "./LocalDateTime";
export default function InvitationCard({party}:{party:{id:string;leader:string;encounters:string;start:string}}){
  return <div className="card stack"><strong>Raid invitation from {party.leader}</strong><span>{party.encounters} · <LocalDateTime iso={party.start}/></span><p className="muted">Open the party to review the run, current members and requested composition before choosing a character.</p><Link className="btn primary" href={`/parties/${party.id}`}>View party</Link></div>;
}
