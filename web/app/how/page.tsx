import Link from "next/link"

export const metadata = {title: "How it works", description: "Where the intelligence is in Sightglass, and where it is not."}

export default function How() {
  return (
    <div className="wrap page">
      <p className="label brass">How it works</p>
      <h1>
        The model points. <em>Code measures.</em>
      </h1>
      <p className="lead fog">
        A model that is asked to read a dial often misplaces the needle. So Sightglass asks it for four positions only, and the Lens computes the value from them with the scale a person wrote on the round card.
      </p>

      <section className="section" style={{paddingTop: 32}}>
        <h2>The path of one reading</h2>
        <svg viewBox="0 0 960 150" role="img" aria-labelledby="flow-t flow-d" style={{width: "100%", height: "auto"}}>
          <title id="flow-t">The path of one reading</title>
          <desc id="flow-d">Look, capture with the overlay hidden, point with Gemini, measure with code, decide by the engineer, sign, countersign.</desc>
          {["Look", "Capture", "Point", "Measure", "Decide", "Sign", "Countersign"].map((t, i) => (
            <g key={t} transform={`translate(${i * 138 + 4} 30)`}>
              <rect width="124" height="64" rx="12" fill="rgba(22,48,58,.7)" stroke={i === 2 ? "#5EEAD4" : "rgba(226,184,107,.55)"} />
              <text x="62" y="38" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12" letterSpacing="2" fill="#F2EDE3">{t.toUpperCase()}</text>
              {i < 6 && <path d={`M126 32 H136`} stroke="#E2B86B" strokeWidth="1.5" />}
            </g>
          ))}
          <text x="4" y="124" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="2" fill="#9FB3B8">LENS: CAMERA, CROP, GEOMETRY, GATE, SENDING   |   MODEL: POINTS ONLY   |   PERSON: DECIDES</text>
        </svg>
        <ol className="fog" style={{lineHeight: 1.8}}>
          <li>The Lens projects the dial rim to screen space and crops the composite frame to it, with 15 percent around.</li>
          <li>For that one frame the overlay (tags, arcs, round card, chevron) is switched off, so the model sees the dial and not the Lens&apos;s own drawing. It comes back on straight after.</li>
          <li>Gemini 2.5 Flash returns JSON against a fixed schema at temperature 0: pivot, needle tip, lowest mark, highest mark, whether the dial is legible, and its own guess of the value.</li>
          <li>Code checks the points lie in the crop, computes the needle angle against the scale from the round card, and refuses if the geometry is not sound.</li>
          <li>The value gets a verdict from the round card limits. A person accepts, corrects or reads by eye. Only then does an entry exist.</li>
        </ol>
      </section>

      <section className="section" style={{paddingTop: 16}}>
        <h2>Where the intelligence is, and is not</h2>
        <div className="tblwrap" tabIndex={0} role="region" aria-label="Data table">
          <table className="tbl">
            <thead><tr><th>Part</th><th>Who decides</th><th>File</th></tr></thead>
            <tbody>
              <tr><td>Where the needle and the scale ends are</td><td>The model (Gemini 2.5 Flash through Snap&apos;s Remote Service Gateway)</td><td className="mono">GaugeReader.ts</td></tr>
              <tr><td>Whether the dial is legible</td><td>The model says so. A person can still read by eye.</td><td className="mono">ReaderContract.ts</td></tr>
              <tr><td>The scale of the gauge</td><td>A person, on the round card. Never the model.</td><td className="mono">RoundPlan.ts</td></tr>
              <tr><td>The number</td><td>Code, from four points and the scale</td><td className="mono">DialGeometry.ts</td></tr>
              <tr><td>Normal, watch or alarm</td><td>Code, from the round card limits</td><td className="mono">Verdict.ts</td></tr>
              <tr><td>Whether a value enters the round</td><td>A person accepts, corrects or reads by eye</td><td className="mono">EvidenceGate.ts</td></tr>
              <tr><td>READY or HOLD</td><td>A person. Code refuses READY over an alarm.</td><td className="mono">EvidenceGate.ts</td></tr>
              <tr><td>Whether the sheet was changed after signing</td><td>A digest, checked again by the door with the same code</td><td className="mono">RoundSheet.ts</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" style={{paddingTop: 16}}>
        <h2>What it will not do</h2>
        <ul className="fog" style={{lineHeight: 1.8}}>
          <li>Put a value in the round that nobody looked at.</li>
          <li>Sign READY with a reading in alarm.</li>
          <li>Take the scale from the model.</li>
          <li>Say a sheet was sent before the door answered 200 or 201.</li>
        </ul>
        <p style={{marginTop: 24}}>
          <Link href="/proof" className="btn">See how each of these was tested</Link>
        </p>
      </section>
    </div>
  )
}
