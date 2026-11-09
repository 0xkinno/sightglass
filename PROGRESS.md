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

## P3 (9 Nov 2026) - NOT DONE, partial
Built: stations, PlantSim, dials, tags, round card, chevron, sign flow, fixture reader (Assets/Scripts/*.ts). Compiles clean in Lens Studio 5.23.2. A scripted full round in Interactive Preview (builder self-test, direct calls, not real pinches) printed PASS for: alarm tag and card text, READY refused, HOLD needs an escalation, Correct by one step, fogged gauge refused then By eye, summary line, short code 3AE4. No log errors.

Not done, no P3 task is ticked:
- LEAF c1 to c5 are written (Assets/Tests/) and register in the Lens, but have never been run. The LEAF plugin stayed "Not Connected": list and run requests timed out. The preview had been left paused; after setting it back to Interactive the editor stopped answering.
- verify-preview from the user's eye at each station was not done. Tag and card backplates looked invisible in the builder's screenshots. Fog quad and band arc not confirmed visually.
- Scene file not committed (unsaved, token state not confirmed). Assets/GeneratedSFX (two placeholder tones) not committed.

Facts for the next session:
- InteractionKit 4.x and UI Kit 4.x do not compile on 5.23.2. Use SpectaclesInteractionKit 2.0.0 and SpectaclesUIKit 2.0.0 (folder "SpectaclesUIKit 2.lspkg"). Imports in GaugeTag.ts and RoundCard.ts use that path.
- Leaf 4.0.0 needs InteractionKit 4.x and cannot work here. Leaf 2.0.2 works with SIK 2.0.0 but its folder must be named Leaf.lspkg. It has no waitUntil; the test kit carries its own.
- After a Lens Studio restart the MCP server may move port; reconnect the session.
