# Web door headstart

Copy from reference/dogwatch/web (Kinnoski's own repo, Apache-2.0) and retheme per DESIGN tokens in
SIGHTGLASS_BUILD_INSTRUCTION.md Part 11:
- app/layout.tsx (next/font/local pattern; swap to Zodiak, Switzer, JetBrains Mono)
- components/Nav.tsx (turn the pill into a 12 px radius square capsule)
- components/GlowCard.tsx (pointer-following glow; retune to --glass #5EEAD4)
- components/SmoothScroll.tsx (lenis), components/Reveal.tsx (motion), components/CountUp.tsx
- tests/ Playwright and axe setup
Then build app/handover, app/handover/[id], app/proof, app/how, app/judge and app/api/* per Part 11.
The API imports ../Assets/Scripts/Core/RoundSheet.ts so the door and the Lens verify the same digest.
