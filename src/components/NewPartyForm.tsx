"use client";
import PartyForm from "./PartyForm";
type E={id:string;code:string;name:string};
export default function NewPartyForm({encounters,partySize}:{encounters:E[];partySize:number}){return <PartyForm encounters={encounters} partySize={partySize}/>;}
