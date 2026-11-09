"use client"
import {animate} from "motion/react"
import {useEffect, useState} from "react"

// Hero instrument: a 150 mm style gauge, 0 to 6 bar, and a sight glass. The needle sweeps to its reading once,
// the glass level rises with it, then the four points the reader places appear. Geometry is the same sweep the
// Lens uses: 270 degrees clockwise, lowest mark lower left, highest lower right.
const CX = 160
const CY = 180
const R = 136
const MAX = 6
const READING = 2.6
const A0 = 135
const SWEEP = 270

function pt(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180
  return {x: CX + r * Math.cos(a), y: CY + r * Math.sin(a)}
}
const angleOf = (v: number) => A0 + (SWEEP * v) / MAX

export function HeroInstrument() {
  const [t, setT] = useState(0)
  const [done, setDone] = useState(false)
  useEffect(() => {
    // Read the preference directly: with reduced motion the final state shows at once.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1)
      setDone(true)
      return
    }
    const c = animate(0, 1, {duration: 1.4, delay: 0.4, ease: [0.22, 1, 0.36, 1], onUpdate: setT, onComplete: () => setDone(true)})
    return () => c.stop()
  }, [])

  const value = READING * t
  const needle = angleOf(value)
  const tip = pt(angleOf(READING), 100)
  const minP = pt(A0, R - 14)
  const maxP = pt(A0 + SWEEP, R - 14)
  const ticks = []
  for (let i = 0; i <= 30; i++) {
    const major = i % 5 === 0
    const a = A0 + (SWEEP * i) / 30
    const p1 = pt(a, R - (major ? 22 : 14))
    const p2 = pt(a, R - 6)
    ticks.push(<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#F2EDE3" strokeWidth={major ? 2.2 : 1} opacity={major ? 0.95 : 0.5} />)
  }
  const nums = []
  for (let v = 0; v <= MAX; v++) {
    const p = pt(angleOf(v), R - 40)
    nums.push(
      <text key={v} x={p.x} y={p.y + 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="15" fill="#F2EDE3">
        {v}
      </text>,
    )
  }
  const glassTop = 52
  const glassH = 256
  const level = glassH * (value / MAX)
  return (
    <svg viewBox="0 0 520 360" className="instrument" role="img" aria-labelledby="inst-t inst-d">
      <title id="inst-t">A pressure gauge and a sight glass</title>
      <desc id="inst-d">The needle sweeps from zero to 2.6 bar while the sight glass fills. Four teal rings then mark the pivot, the needle tip and the two ends of the scale.</desc>
      <defs>
        <radialGradient id="face" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#1c3b46" />
          <stop offset="100%" stopColor="#0f1d23" />
        </radialGradient>
        <linearGradient id="glassfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2b8f84" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="520" height="360">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={CX} cy={CY} r={R + 12} fill="none" stroke="#E2B86B" strokeWidth="6" />
      <circle cx={CX} cy={CY} r={R + 4} fill="url(#face)" stroke="rgba(226,184,107,.45)" strokeWidth="1" />
      {ticks}
      {nums}
      <text x={CX} y={CY + 62} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="13" letterSpacing="2" fill="#9FB3B8">
        BAR
      </text>
      <g transform={`rotate(${needle} ${CX} ${CY})`} filter="url(#glow)">
        <line x1={CX - 22} y1={CY} x2={CX + 104} y2={CY} stroke="#5EEAD4" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <circle cx={CX} cy={CY} r="9" fill="#0f1d23" stroke="#E2B86B" strokeWidth="2" />

      <rect x="462" y={glassTop - 8} width="36" height={glassH + 16} rx="18" fill="rgba(242,237,227,.05)" stroke="#E2B86B" strokeWidth="2" />
      <rect x="470" y={glassTop + glassH - level} width="20" height={level} rx="10" fill="url(#glassfill)" />
      <text x="498" y="338" textAnchor="end" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="2" fill="#9FB3B8">
        SIGHT GLASS
      </text>

      <g style={{opacity: done ? 1 : 0, transition: "opacity .5s ease-out"}} aria-hidden="true">
        {[
          {p: tip, label: "tip", ly: 62},
          {p: {x: CX, y: CY}, label: "pivot", ly: 128},
          {p: minP, label: "min", ly: 238},
          {p: maxP, label: "max", ly: 302},
        ].map((q) => (
          <g key={q.label}>
            <line x1={q.p.x} y1={q.p.y} x2={330} y2={q.ly - 4} stroke="rgba(94,234,212,.5)" strokeWidth="1" />
            <circle cx={q.p.x} cy={q.p.y} r="9" fill="none" stroke="#5EEAD4" strokeWidth="1.6" />
            <text x={336} y={q.ly} textAnchor="start" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="2" fill="#5EEAD4">
              {q.label.toUpperCase()}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
