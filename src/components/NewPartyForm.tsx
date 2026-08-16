"use client";
import PartyForm from "./PartyForm";
type E={id:string;code:string;name:string};
export default function NewPartyForm({encounters}:{encounters:E[]}){return <PartyForm encounters={encounters}/>;}
