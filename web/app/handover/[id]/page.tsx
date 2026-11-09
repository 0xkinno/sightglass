import {notFound} from "next/navigation"
import {verifyDigest} from "../../../lib/core/RoundSheet"
import type {RoundSheet} from "../../../lib/core/RoundSheet"
import {ID_RE} from "../../../lib/schema"
import type {StoredRound} from "../../../lib/schema"
import {getRound, storeConfigured} from "../../../lib/store"
import {Countersign} from "../../../components/Countersign"

export const dynamic = "force-dynamic"
export const metadata = {title: "Round sheet | Sightglass"}

const when = (ms: number | null) => (ms ? new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "not read")

function Frame({src, points}: {src: string; points: StoredRound["sheet"]["entries"][number]["points"]}) {
  // Points are in crop pixels as the Lens sent them. They are drawn in a 0..1 box when they fit, else hidden.
  const pts = points ? [points.center, points.needleTip, points.minMark, points.maxMark] : []
  const unit = pts.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)
  return (
    <span className="frame" style={{maxWidth: 360}}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="The crop the reader was shown" />
      {points && unit && (
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          <line x1={points.center.x} y1={points.center.y} x2={points.needleTip.x} y2={points.needleTip.y} stroke="#5EEAD4" strokeWidth="0.008" />
          {[["center", points.center], ["tip", points.needleTip], ["min", points.minMark], ["max", points.maxMark]].map(([n, p]) => {
            const q = p as {x: number; y: number}
            return <circle key={n as string} cx={q.x} cy={q.y} r="0.02" fill="none" stroke="#5EEAD4" strokeWidth="0.008" />
          })}
        </svg>
      )}
    </span>
  )
}

export default async function Sheet({params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  if (!ID_RE.test(id) || !storeConfigured()) notFound()
  const r = await getRound(id)
  if (!r) notFound()
  const s = r.sheet
  const intact = verifyDigest(s as unknown as RoundSheet, r.digest)
  return (
    <article>
      <p className="label">{r.recorded ? "Recorded from the Lens Studio preview" : "Round sheet"} / {s.source}</p>
      <h1>{s.planName}</h1>
      <p>
        <span className={"pill " + s.decision}>{s.decision}</span> signed by {s.signer} at {when(s.signedAtMs)}.
        {s.escalation ? " Escalation: " + s.escalation : ""}
      </p>
      <p className="label">Digest, checked again just now: {intact ? "matches" : "DOES NOT MATCH"}</p>
      <p className="digest brass">{r.digest}</p>
      <p className="fog">
        Seen {s.counts.seen}, corrected {s.counts.corrected}, by eye {s.counts.byEye}. Alarm {s.counts.alarm}, watch {s.counts.watch}.
      </p>
      <hr />
      <div className="row two">
        {s.entries.map((e) => (
          <div key={e.gaugeId} className="glow-card">
            <p className="label">{e.gaugeId}</p>
            <h2 style={{fontSize: 26}}>{e.value === null ? "not read" : e.value}</h2>
            <p>
              <span className={"pill " + e.state}>{e.state.replace("_", " ")}</span>{" "}
              {e.verdict && <span className={"pill " + e.verdict}>{e.verdict}</span>}
            </p>
            {e.state === "CORRECTED" && <p className="fog">Computed from the frame: {e.computedValue}. Changed by the engineer.</p>}
            {e.frameRef && r.frames[e.frameRef] && <Frame src={r.frames[e.frameRef]} points={e.points} />}
            {e.notes.map((n, i) => <p key={i} className="fog" style={{margin: "4px 0"}}>{n}</p>)}
            <p className="label">Looked at {when(e.atMs)}</p>
          </div>
        ))}
      </div>
      <hr />
      <h2>Countersign</h2>
      {r.countersigns.map((c, i) => (
        <p key={i}>Countersigned by {c.role} at {when(c.atMs)}. {c.note}</p>
      ))}
      {r.countersigns.length === 0 && <p className="fog">Not countersigned yet.</p>}
      <Countersign id={s.roundId} digest={r.digest} disabled={!intact} />
    </article>
  )
}
