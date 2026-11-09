# PROGRESS

## P0 (9 Nov 2026)
Done. Platform probes (a) to (d) pass. Evidence: devpost/evidence/PLATFORM_PROBE.md.

Decisions and facts for later phases:
- Project target platform set to Spectacles. Preview device SPECS 27, Interactive input.
- Remote Service Gateway 0.2.0 (not 4.0.0). Import path has spaces: `Remote Service Gateway.lspkg/...`.
- Gemini via RSG answers as gemini-2.5-flash in about 1.6 to 2.0 s. Vision JSON on a drawn dial read 70 bar, correct.
- RSG tokens expire in about one hour. Regenerate with Network.performAuthorizedHttpRequest in ExecuteEditorCode and call project.save() in the same run.
- Do not place the RemoteServiceGatewayExamples prefab.
- The scene has one object, RSG_Credentials, holding the credentials component.

## P1 (9 Nov 2026)
Done. Kinnoski answered the plan-lens interview in his own words and approved devpost/design-brief.md (status: approved). MOMENT.md and THESIS.md written.

Facts for later phases:
- The interview first drifted to a coding-agent dashboard. Kinnoski dropped that and restated the engine-room round concept. The approved brief is the engine-room one.
- Brief defaults, marked (default) in the brief: virtual engine room with three stand-in gauges, a pinch on a dot beside a gauge stands for looking at it, round sheet about 60 to 80 cm away and 30 by 20 cm, buttons at least 4 cm, Correct by plus and minus buttons, Send as a pinch button.
- The plan-lens skill is not registered as a callable skill in this harness. It was run from agent/skills/plan-lens/SKILL.md.
- THESIS.md PROOF line carries no figures until docs/FACTS.json exists.

Next: P2.

## P2 (9 Nov 2026)
Done. Core in Assets/Scripts/Core, tests in tests/, root package.json. 17 of 17 pass under tsx. Core compiles in Lens Studio.
One change to the headstart Core: two type casts in EvidenceGate.ts, because Lens Studio's non-strict TypeScript does not narrow the union types. Behaviour is unchanged and the tests still pass.

## P6 (9 Nov 2026), partly done
Built in web/, not deployed yet.
- Next.js 15 app: /api/rounds (POST, GET), /api/rounds/[id], /api/rounds/[id]/countersign, /api/status, pages /, /handover, /handover/[id] with a Countersign button bound to the digest.
- Digest check uses Core copies in web/lib/core (RoundSheet, Sha256 and what they import). Vercel builds from web/ only, so the copies are committed. `npm run sync-core` refreshes them, `node scripts/sync-core.mjs --check` fails if they drift.
- Checked locally with no store: typecheck clean, 5 door tests pass (digest matches Node crypto, tampered value gives 422, unknown fields refused), build passes, a good sheet reaches the store step and returns 503 "not configured", a tampered sheet returns 422.
- Not verified: anything against a real Blob store (post, list, get, countersign, measured /api/status).
- Rate limit is in memory per server instance, so it is a soft cap. The door says so.
- Frames travel in the POST as a `frames` map of frameRef to data URL, outside the digest. Lens SheetSender must send them. Points are drawn on the crop only when they are normalised 0..1.
- Fonts: Zodiak and Switzer are not in the repo; JetBrains Mono is. Hero, /proof, /how, /judge are P9.
- Waiting on Kinnoski: Vercel project name and URL, then create, link a Blob store, deploy.

P6 update (9 Nov 2026): deployed.
- Live at https://sightglass-kinno.vercel.app (Vercel project sightglass-kinno, team kinnoskis-projects, Blob store sightglass-rounds connected, production deploy from web/).
- Checked live with curl: good sheet 201, tampered sheet 422, get 200, countersign with wrong digest 409, with right digest 200, /handover/[id] 200, /api/status ok with blobListMs 29. The test round was deleted afterwards, the door is empty.
- Production URL is public (no Vercel login wall). Deployment protection on the project was left as created; the production alias is not gated. Preview URLs may be.
- Still pending, needs P3/P4: SheetSender pointing at the live URL, a full preview round landing on the door, and keeping it as the recorded sample.
