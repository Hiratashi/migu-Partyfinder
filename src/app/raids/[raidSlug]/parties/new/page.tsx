import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRaidBySlug, getRaidEncounters } from "@/lib/raids";
import PartyForm from "@/components/PartyForm";

export default async function NewRaidParty({
  params,
}:{
  params:Promise<{raidSlug:string}>;
}) {
  await requireUser();
  const {raidSlug}=await params;
  const raid=await getRaidBySlug(raidSlug);

  if(!raid)notFound();

  const encounters=await getRaidEncounters(raid.id);

  return <main>
    <div className="eyebrow">{raid.name}</div>
    <h1>Create party</h1>
    <p className="muted">
      Full Run selects all configured fights. Party requirements are
      capped by this raid's {raid.party_size}-player limit.
    </p>

    <PartyForm
      raidSlug={raid.slug}
      raidName={raid.name}
      encounters={encounters}
      partySize={raid.party_size}
      supportedStages={raid.supported_stages}
      defaultStage={raid.default_stage}
      practiceSupported={raid.practice_supported}
    />
  </main>;
}
