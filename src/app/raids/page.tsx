import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveRaids, getRaidEncounters } from "@/lib/raids";

export default async function RaidsPage() {
  await requireUser();
  const raids=await getActiveRaids();

  const withCounts=await Promise.all(
    raids.map(async raid=>({
      ...raid,
      encounters:(await getRaidEncounters(raid.id)).length,
    })),
  );

  return <main>
    <h1>Choose a raid</h1>
    <p className="muted">
      Party settings are loaded from the raid configuration.
    </p>

    <div className="grid">
      {withCounts.map(raid=>
        <article className="card stack" key={raid.id}>
          <div>
            <div className="eyebrow">Raid</div>
            <h2>{raid.name}</h2>
          </div>
          <div className="row">
            <span className="pill">{raid.party_size} players</span>
            <span className="pill">{raid.encounters} fights</span>
            <span className="pill">
              Stages {raid.supported_stages.join(", ")}
            </span>
          </div>
          <Link
            className="btn primary"
            href={`/raids/${raid.slug}/parties/new`}
          >
            Create {raid.name} party
          </Link>
        </article>
      )}

      {withCounts.length===0&&
        <div className="card muted">No active raids are configured.</div>
      }
    </div>
  </main>;
}
