"use client";

import PartyForm from "./PartyForm";

type E = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  raidSlug: string;
  raidName: string;
  encounters: E[];
  partySize: number;
  supportedStages: number[];
  defaultStage: number;
  practiceSupported: boolean;
};

export default function NewPartyForm(props: Props) {
  return <PartyForm {...props} />;
}
