import facts from "../../lib/facts.json"

export const metadata = {title: "Proof", description: "What was measured for Sightglass, with the misses included. Every number is read from docs/FACTS.json."}

const a = facts.previewReads.shipped
const b = facts.previewReads.scaleHintTried
const gauges = Object.keys(a.perGauge)

export default function Proof() {
  return (
    <div className="wrap page">
      <p className="label brass">Proof</p>
      <h1>
        What was measured, and <em>where it fell short.</em>
      </h1>
      <p className="lead fog">
        Every number on this page comes from <span className="mono">docs/FACTS.json</span>, which <span className="mono">scripts/facts.mjs</span> writes from the evidence files in the repository. Generated {facts.generatedAt.slice(0, 10)}. The room, the gauges and the plant are stand-ins in the Lens Studio preview, so this is a measurement of the reading path, not of a ship.
      </p>

      <section className="section" style={{paddingTop: 40}}>
        <h2>Live reads against the plant simulator</h2>
        <p className="fog">8 gauges, 5 captures each with the overlay hidden, plus 3 each with it shown. Truth is the PlantSim value at the moment of capture. Error is in minor ticks of the gauge. One tick is the smallest printed division.</p>
        <div className="tblwrap" tabIndex={0} role="region" aria-label="Data table">
          <table className="tbl">
            <thead>
              <tr><th>Run</th><th>Captures</th><th>Read</th><th>Median error</th><th>Mean error</th><th>Within 1 tick</th><th>Within 2 ticks</th><th>Median time</th></tr>
            </thead>
            <tbody>
              <tr><td>Tried: with a scale hint line, overlay hidden (not adopted)</td><td className="n">{b.hide.captures}</td><td className="n">{b.hide.read} of {b.hide.legibleCaptures}</td><td className="n">{b.hide.medianAbsErrTicks}</td><td className="n">{b.hide.meanAbsErrTicks}</td><td className="n">{b.hide.within1Tick}</td><td className="n">{b.hide.within2Ticks}</td><td className="n">{b.hide.medianMs} ms</td></tr>
              <tr><td>Shipped configuration, overlay hidden</td><td className="n">{a.hide.captures}</td><td className="n">{a.hide.read} of {a.hide.legibleCaptures}</td><td className="n">{a.hide.medianAbsErrTicks}</td><td className="n">{a.hide.meanAbsErrTicks}</td><td className="n">{a.hide.within1Tick}</td><td className="n">{a.hide.within2Ticks}</td><td className="n">{a.hide.medianMs} ms</td></tr>
              <tr><td>Shipped configuration, overlay shown</td><td className="n">{a.show.captures}</td><td className="n">{a.show.read} of {a.show.legibleCaptures}</td><td className="n">{a.show.medianAbsErrTicks}</td><td className="n">{a.show.meanAbsErrTicks}</td><td className="n">{a.show.within1Tick}</td><td className="n">{a.show.within2Ticks}</td><td className="n">{a.show.medianMs} ms</td></tr>
            </tbody>
          </table>
        </div>
        <p className="fog" style={{marginTop: 14}}>
          Rows count legible dials only. The fogged dial is below. The shipped request adds the crop size in pixels and sets the thinking budget to 0. The scale hint is one more line saying how a 270 degree scale is laid out. It was tried because one live read had put the scale ends on the wrong sides, and it did not help, so it is off. The shared prompt in <span className="mono">ReaderContract.ts</span> is unchanged in every run.
        </p>
      </section>

      <section className="section" style={{paddingTop: 16}}>
        <h2>Per gauge: pointing against the model&apos;s own number</h2>
        <p className="fog">Code computes the value from the points the model places. The model also returns its own guess, which is recorded and never used. Where the two differ, the pointing step is the weak part.</p>
        <div className="tblwrap" tabIndex={0} role="region" aria-label="Data table">
          <table className="tbl">
            <thead>
              <tr><th>Gauge</th><th>Reads</th><th>Mean error from points (ticks)</th><th>Mean error of the model&apos;s own number (ticks)</th></tr>
            </thead>
            <tbody>
              {gauges.map((g) => (
                <tr key={g}>
                  <td className="n">{g}</td>
                  <td className="n">{a.perGauge[g as keyof typeof a.perGauge].reads}</td>
                  <td className="n">{a.perGauge[g as keyof typeof a.perGauge].meanAbsErrTicks}</td>
                  <td className="n">{a.perGauge[g as keyof typeof a.perGauge].modelValueMeanAbsErrTicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" style={{paddingTop: 16}}>
        <h2>The misses</h2>
        <div className="callout">
          <p><b>Fogged dial.</b> The fog quad in the stand-in scene is too light. The reader flagged the dial unreadable {a.hide.foggedCantRead} of {a.hide.foggedCaptures} times with the overlay hidden. The legibility gate was not properly tested by this stand-in.</p>
          <p><b>A wrong read can look alarming.</b> {a.hide.falseAlarms} reads of the engine jacket water outlet gauge came out well above the true value and crossed into ALARM, with the overlay hidden, although the plant value was normal. A person must still accept each one, and the tag shows the number and the verdict word, but the gate cannot catch a wrong number a person agrees with.</p>
          <p><b>Three gauges carry a steady bias.</b> The jacket water outlet, scavenge air and starting air gauges read 4 to 7 ticks high from the points, while the model&apos;s own number for them is within about one tick. The pointing step is the weak part and is not fixed. A line telling the model how the scale is laid out was tried and did not help.</p>
          <p><b>Overlay hidden or shown.</b> No difference this sample can show. Hiding it costs a few frames and removes the risk, so it stays.</p>
          <p><b>Tokens.</b> The gateway response carries no usage count, so tokens per read are not recorded. Nothing is estimated.</p>
          <p><b>Wild set.</b> The 200 real dial photos evaluation is pre-registered in <span className="mono">headstart/eval/PREREGISTRATION.md</span> and has not been run, so this page states no figure for it.</p>
        </div>
      </section>

      <section className="section" style={{paddingTop: 16}}>
        <h2>Tests</h2>
        <div className="tblwrap" tabIndex={0} role="region" aria-label="Data table">
          <table className="tbl">
            <thead><tr><th>What</th><th>Result</th><th>File</th></tr></thead>
            <tbody>
              <tr><td>Unit tests of Core, the same files the Lens runs</td><td className="n">{facts.coreTests.passed} pass, {facts.coreTests.failed} fail</td><td className="mono">tests/core.test.ts</td></tr>
              <tr><td>LEAF scenarios on the fixture reader</td><td className="n">{facts.leaf.passedOnFixtureReader} of {facts.leaf.scenarios} pass</td><td className="mono">devpost/evidence/leaf-p5-suite.log</td></tr>
              <tr><td>Planted breaks, one per extra scenario</td><td className="n">{facts.breakProofs.wentRed} of {facts.breakProofs.planted} went red, {facts.breakProofs.backToGreen} back to green</td><td className="mono">devpost/evidence/break-proofs.log</td></tr>
              <tr><td>Pinch targets at station distance</td><td className="n">{facts.pinchTargets?.measured} measured, {facts.pinchTargets?.problems} below 2 degrees or within 1 degree of a neighbour</td><td className="mono">Assets/Tests/ExtraPinchTargets.ts</td></tr>
              <tr><td>Signed round sent to the door</td><td className="n">HTTP {facts.send.realPostStatus}, forced failure {facts.send.forcedFailureStatus} shown as Not sent</td><td className="mono">Assets/Tests/ExtraSend.ts</td></tr>
              <tr><td>c1 in live mode</td><td className="n">{facts.leaf.c1Live}</td><td className="mono">devpost/evidence/leaf-p5-suite.log</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
