import Link from "next/link"

// Square capsule, 12 px radius, hairline brass border (DESIGN tokens). Links grow as pages land.
export function Nav() {
  return (
    <header>
      <nav className="nav" aria-label="Primary">
        <Link href="/" className="brand">Sightglass</Link>
        <ul>
          <li><Link href="/handover">Handover</Link></li>
        </ul>
        <Link href="/handover" className="btn" style={{minHeight: 40, padding: "0 16px"}}>Open the handover</Link>
      </nav>
    </header>
  )
}
