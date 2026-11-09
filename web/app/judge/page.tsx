import Link from "next/link"

export const metadata = {title: "For judges", description: "Three ways through Sightglass: 60 seconds, 3 minutes, 10 minutes."}

export default function Judge() {
  return (
    <div className="wrap page">
      <p className="label brass">For judges</p>
      <h1>
        Three ways in, <em>by how long you have.</em>
      </h1>
      <p className="lead fog">The machinery space in the Lens is a stand-in and is labelled so in the scene. The camera crop, the model call, the geometry, the evidence gate and the sending are live.</p>

      <div className="three" style={{marginTop: 32}}>
        <div className="glow-card">
          <p className="label">60 seconds</p>
          <h3>See it</h3>
          <ol className="fog" style={{paddingLeft: 20}}>
            <li>Read the landing page: <Link href="/">the round, shown</Link>.</li>
            <li>Open a signed sheet on <Link href="/handover">the handover door</Link>.</li>
            <li>Check the digest line says it matches.</li>
          </ol>
        </div>
        <div className="glow-card">
          <p className="label">3 minutes</p>
          <h3>Trust it</h3>
          <ol className="fog" style={{paddingLeft: 20}}>
            <li>Read <Link href="/how">how it works</Link>: the model points, code measures.</li>
            <li>Read <Link href="/proof">the proof</Link>, including the misses.</li>
            <li>Countersign a round on the door. It is bound to the digest you see.</li>
          </ol>
        </div>
        <div className="glow-card">
          <p className="label">10 minutes</p>
          <h3>Break it</h3>
          <ol className="fog" style={{paddingLeft: 20}}>
            <li>Clone the repository and run <span className="mono">npm test</span> for the Core tests.</li>
            <li>Open the project in Lens Studio 5.23.2 and run a LEAF scenario with <span className="mono">Assets/Tests/InLensRunner.ts</span>.</li>
            <li>Read <span className="mono">devpost/evidence/break-proofs.log</span>: one planted break per extra scenario, seen red, then restored.</li>
          </ol>
        </div>
      </div>

      <section className="section" style={{paddingTop: 48}}>
        <h2>What is live, what is a stand-in</h2>
        <div className="tblwrap" tabIndex={0} role="region" aria-label="Data table">
          <table className="tbl">
            <thead><tr><th>Part</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Stations, dials and the plant values</td><td>Stand-in, built for the preview</td></tr>
              <tr><td>Pinch on the dot beside a gauge</td><td>Stands for looking at the gauge</td></tr>
              <tr><td>Camera crop of the composite frame</td><td>Live</td></tr>
              <tr><td>Model call through Remote Service Gateway</td><td>Live</td></tr>
              <tr><td>Geometry, verdicts, evidence gate</td><td>Live, the same files the unit tests run</td></tr>
              <tr><td>Sending the signed sheet</td><td>Live, to this door</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
