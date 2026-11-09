import Link from "next/link"
import facts from "../lib/facts.json"
import {HeroInstrument} from "../components/HeroInstrument"
import {GlowCard} from "../components/GlowCard"
import {Reveal} from "../components/Reveal"
import {SmoothScroll} from "../components/SmoothScroll"

const pr = facts.previewReads.shipped.hide
const leaf = facts.leaf
const proofs = facts.breakProofs

function Icon({name}: {name: string}) {
  const p: Record<string, React.ReactNode> = {
    look: (<><path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16z" /><circle cx="16" cy="16" r="4" /></>),
    point: (<><circle cx="16" cy="16" r="9" /><path d="M16 3v6M16 23v6M3 16h6M23 16h6" /></>),
    measure: (<><path d="M6 24a12 12 0 1 1 20 0" /><path d="M16 22l6-9" /><circle cx="16" cy="22" r="1.6" /></>),
    decide: (<><path d="M6 17l6 6L26 9" /></>),
    sign: (<><path d="M4 24c4 0 4-10 8-10s2 8 6 8 3-6 5-6 2 3 5 3" /><path d="M4 28h24" /></>),
    countersign: (<><path d="M5 17l5 5 8-10" /><path d="M14 22l1 1 10-12" /></>),
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {p[name]}
    </svg>
  )
}

const STEPS = [
  {icon: "look", h: "Look", t: "The engineer looks at a gauge. In the preview a pinch on the dot beside it stands for the look."},
  {icon: "point", h: "Point", t: "The Lens crops that dial from the camera view and asks Gemini only where four things are: the pivot, the needle tip and the two ends of the scale."},
  {icon: "measure", h: "Measure", t: "Code turns the four points into a value using the scale printed on the round card. The model never supplies the scale or the number."},
  {icon: "decide", h: "Decide", t: "The engineer accepts, corrects with plus and minus, or reads it by eye. A dial that cannot be read says so and is never guessed."},
  {icon: "sign", h: "Sign", t: "READY needs every gauge read and none in alarm. HOLD needs the engineer to say who was told. The sheet gets a short code."},
  {icon: "countersign", h: "Countersign", t: "The sheet reaches the chief engineer, who countersigns the exact digest on screen, with the frames that were seen."},
]

const SHOTS = [
  {src: "/screens/01-look-station.webp", h: "The station.", t: "Four dials on a stand-in main engine panel, a dot beside each. Nothing is drawn on the dials until one is read."},
  {src: "/screens/02-tag-band-arc.webp", h: "A reading.", t: "The tag at the rim gives value, unit and verdict. A thin arc marks the normal band: mint, amber, coral. The glass on the left dial is fogged."},
  {src: "/screens/03-cant-read-it.webp", h: "Can't read it.", t: "When the reader is not sure, the tag says so and offers By eye or Retry. It never shows a guess as a reading."},
  {src: "/screens/04-decision-column.webp", h: "Accept, Correct, By eye.", t: "Three large targets in a column, each at least 2 degrees across with 1 degree between them at station distance."},
]

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <picture>
            <source media="(max-width: 700px)" srcSet="/hero-m.webp" />
            <img src="/hero.webp" alt="" width={1600} height={900} fetchPriority="high" />
          </picture>
        </div>
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <p className="label brass">A SPECS Lens for the engine room round</p>
              <h1>
                Every reading, <em>seen.</em>
              </h1>
              <p className="sub">
                Sightglass reads each gauge as you look at it, and you sign a log where nothing was assumed.
              </p>
              <div className="actions">
                <a href="https://youtu.be/66xntf96bA4" className="btn solid">Watch the film (2:50)</a>
                <Link href="#round" className="btn brassline">See the round</Link>
                <Link href="/handover" className="btn">Open the handover</Link>
              </div>
            </div>
          </div>
          <div className="stats">
            <GlowCard>
              <div className="num">
                {pr.within1Tick} <small>of {pr.read}</small>
              </div>
              <p>live reads inside one minor tick of the true value in the preview, overlay hidden. The misses are on /proof.</p>
            </GlowCard>
            <GlowCard tone="amber">
              <div className="num">
                {leaf.passedOnFixtureReader} <small>of {leaf.scenarios}</small>
              </div>
              <p>LEAF scenarios pass. Each of the five extras was seen failing once with a planted break, then restored.</p>
            </GlowCard>
            <GlowCard>
              <div className="num">
                {facts.coreTests.passed} <small>of {facts.coreTests.passed}</small>
              </div>
              <p>unit tests pass on the same Core files the Lens runs. {proofs.wentRed} of {proofs.planted} planted breaks went red.</p>
            </GlowCard>
          </div>
        </div>
      </section>

      <section className="section wrap" id="moment">
        <div className="head"><span className="num">01</span><span className="rule" /><span className="label" style={{margin: 0}}>The moment</span></div>
        <Reveal>
          <p className="moment">
            It is 21:40 on a merchant ship. In about an hour the engine room runs unmanned for the night. The duty engineer walks every space and reads every local gauge, a torch in one hand and a rag in the other.
          </p>
          <p className="lead fog">
            Today each value is written in the engine log by hand. When the engineer is rushed, the log can fill up with numbers that were assumed. Nothing in the log says which ones.
          </p>
        </Reveal>
      </section>

      <section className="section wrap" id="what">
        <div className="head"><span className="num">02</span><span className="rule" /><span className="label" style={{margin: 0}}>What it does</span></div>
        <h2>Six steps, and the engineer decides every one that matters.</h2>
        <div className="readrow">
          <HeroInstrument />
          <div>
            <p className="label brass">One reading, drawn</p>
            <h3>The model finds four points. Code does the rest.</h3>
            <p className="fog">
              The needle sweeps to its value and the sight glass rises with it. The four rings are what Gemini is asked for: the pivot, the needle tip and the two ends of the scale. The number, the unit check and the verdict are computed in the Lens from those points and the scale on the round card.
            </p>
          </div>
        </div>
        <ol className="steps" style={{marginTop: 28}}>
          {STEPS.map((s) => (
            <li key={s.h}>
              <GlowCard as="div" className="step">
                <Icon name={s.icon} />
                <h3>{s.h}</h3>
                <p>{s.t}</p>
              </GlowCard>
            </li>
          ))}
        </ol>
      </section>

      <section className="section wrap" id="round">
        <div className="head"><span className="num">03</span><span className="rule" /><span className="label" style={{margin: 0}}>The round, shown</span></div>
        <h2>Real captures from the Lens Studio preview.</h2>
        <p className="fog lead">The machinery space is a stand-in and says so in the scene. The tags, the arcs, the buttons and the reading are the Lens.</p>
        <ul className="shots" style={{marginTop: 28}}>
          {SHOTS.map((s) => (
            <li key={s.src}>
              <figure>
                <img src={s.src} alt={s.h + " " + s.t} width={1044} height={858} loading="lazy" />
                <figcaption>
                  <b>{s.h}</b> {s.t}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <section className="section wrap" id="glasses">
        <div className="head"><span className="num">04</span><span className="rule" /><span className="label" style={{margin: 0}}>Why glasses</span></div>
        <h2>All three strengths, each doing a job.</h2>
        <div className="three" style={{marginTop: 28}}>
          <GlowCard>
            <p className="label">Shares your view</p>
            <h3>The camera frame is the evidence.</h3>
            <p className="fog">The reading comes from what the engineer is looking at. A phone needs a free hand, a photo per gauge and a pocket full of oil.</p>
          </GlowCard>
          <GlowCard tone="amber">
            <p className="label">Draws in the world</p>
            <h3>The tag and the arc sit on the dial.</h3>
            <p className="fog">A tag at the rim, a thin arc for the normal band, a chevron at the edge of view toward the next gauge.</p>
          </GlowCard>
          <GlowCard>
            <p className="label">Leaves your body free</p>
            <h3>Torch, rag, handrail.</h3>
            <p className="fog">A reading happens on a look. The only inputs are large pinch targets, measured at station distance.</p>
          </GlowCard>
        </div>
      </section>

      <section className="section wrap" id="proof">
        <div className="head"><span className="num">05</span><span className="rule" /><span className="label" style={{margin: 0}}>Proof</span></div>
        <h2>What was measured, and where it fell short.</h2>
        <div className="tblwrap" tabIndex={0} role="region" aria-label="Data table" style={{marginTop: 24}}>
          <table className="tbl">
            <thead>
              <tr><th>Check</th><th>Result</th><th>Where</th></tr>
            </thead>
            <tbody>
              <tr><td>Live reads in the preview, overlay hidden</td><td className="n">{pr.within1Tick} of {pr.read} within 1 tick, median error {pr.medianAbsErrTicks} ticks</td><td>/proof</td></tr>
              <tr><td>Fogged dial</td><td className="n">read as unreadable {pr.foggedCantRead} of {pr.foggedCaptures}</td><td>/proof, a miss</td></tr>
              <tr><td>Pinch targets at station distance</td><td className="n">{facts.pinchTargets?.measured} measured, {facts.pinchTargets?.problems} too small</td><td>LEAF extra-pinch-targets</td></tr>
              <tr><td>Signed round sent to the door</td><td className="n">HTTP {facts.send.realPostStatus}, forced failure {facts.send.forcedFailureStatus} shown as Not sent</td><td>LEAF extra-send</td></tr>
            </tbody>
          </table>
        </div>
        <p style={{marginTop: 20}}>
          <Link href="/proof" className="btn">Read the proof, misses included</Link>
        </p>
      </section>

      <section className="section wrap" id="judges">
        <div className="head"><span className="num">06</span><span className="rule" /><span className="label" style={{margin: 0}}>For judges</span></div>
        <h2>The 60 second path.</h2>
        <ul className="links-list" style={{marginTop: 20}}>
          <li><Link href="/judge">Open /judge for the one minute, three minute and ten minute routes.</Link></li>
          <li><Link href="/handover">Open a signed round sheet on the handover door and countersign it.</Link></li>
          <li><a href="https://github.com/0xkinno/sightglass">Read the source and run the tests.</a></li>
        </ul>
      </section>
    </>
  )
}
