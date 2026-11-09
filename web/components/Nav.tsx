import Link from "next/link"

const LINKS = [
  {href: "/how", label: "How it works"},
  {href: "/#round", label: "The round"},
  {href: "/handover", label: "Handover"},
  {href: "/proof", label: "Proof"},
  {href: "/judge", label: "For judges"},
]

// Square capsule, 12 px radius, hairline brass border. On narrow screens the links fold into a menu.
export function Nav() {
  return (
    <header className="navwrap">
      <nav className="nav" aria-label="Primary">
        <Link href="/" className="brand" aria-label="Sightglass home">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <circle cx="13" cy="13" r="11" fill="none" stroke="#E2B86B" strokeWidth="2" />
            <rect x="11" y="6" width="4" height="14" rx="2" fill="#5EEAD4" />
          </svg>
          <span>Sightglass</span>
        </Link>
        <ul className="links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
        </ul>
        <Link href="/handover" className="btn small cta">Open the handover</Link>
        <details className="menu">
          <summary aria-label="Menu">Menu</summary>
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </details>
      </nav>
    </header>
  )
}
