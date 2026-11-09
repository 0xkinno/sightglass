import Link from "next/link"
import {listRounds, storeConfigured} from "../../lib/store"
import type {RoundSummary} from "../../lib/store"

export const dynamic = "force-dynamic"
export const metadata = {title: "Handover | Sightglass"}

const when = (ms: number) => new Date(ms).toISOString().replace("T", " ").slice(0, 16) + " UTC"

export default async function Handover() {
  let rounds: RoundSummary[] = []
  let problem = ""
  if (!storeConfigured()) problem = "The store is not connected yet. No rounds can be received."
  else {
    try {
      rounds = await listRounds()
    } catch (e) {
      problem = "The store did not answer: " + String((e as Error).message).slice(0, 120)
    }
  }
  return (
    <section className="wrap page">
      <p className="label">Handover</p>
      <h1>Round sheets received</h1>
      <p className="fog">Newest first. The recorded sample is pinned. This public door is capped: 2 MB per sheet and 10 sheets per hour per address. There is no login.</p>
      {problem && <p role="alert" className="ALARM">{problem}</p>}
      {!problem && rounds.length === 0 && <p>No rounds yet.</p>}
      <div className="row" style={{marginTop: 24}}>
        {rounds.map((r) => (
          <Link key={r.roundId} href={"/handover/" + r.roundId} style={{textDecoration: "none"}}>
            <article className="glow-card">
              <p className="label">{r.recorded ? "Recorded sample" : r.source}</p>
              <h2 style={{fontSize: 24}}>{r.planName}</h2>
              <p className="fog" style={{margin: 0}}>
                {when(r.signedAtMs)} by {r.signer}. <span className={"pill " + r.decision}>{r.decision}</span>{" "}
                {r.countersigned > 0 ? "Countersigned " + r.countersigned + "x." : "Not countersigned."}
              </p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}
