import Link from "next/link"

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footgrid">
        <div>
          <p className="label">Sightglass</p>
          <p className="fog" style={{margin: 0, maxWidth: 420}}>
            Built for the Learn AR with SPECS hackathon. The machinery space on these pages is a stand-in, and the round card is an example, not a real ship&apos;s.
          </p>
        </div>
        <ul className="footlinks">
          <li><Link href="/how">How it works</Link></li>
          <li><Link href="/proof">Proof</Link></li>
          <li><Link href="/judge">For judges</Link></li>
          <li><a href="https://github.com/0xkinno/sightglass">Source on GitHub</a></li>
        </ul>
      </div>
    </footer>
  )
}
