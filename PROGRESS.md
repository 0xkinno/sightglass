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

## P3 (9 Nov 2026)
Mostly done. LEAF c1 to c5 pass in the preview on the fixture reader. Evidence: devpost/evidence/leaf-p3-preview.log (c2 failed twice on a test assumption, the card resets its escalation row after a recheck, so the test now presses Sign HOLD first; then passed). c5 signed HOLD, "Called the chief engineer", code 4DB3, send logged as fixture, not sent over network.
Stills: devpost/media/film/01-station1-*.png (preview capture), devpost/evidence/p3-station1-*-editor.png (editor screenshots).

Placement fixes from the preview check:
- Round card moved from 22 cm left, 20 cm down to 12 cm left, 34 cm down (still 80 cm away). At 20 cm down it sat over the dial row.
- Idle dot beside each gauge was the stock dark UI Kit face, invisible on an additive display. A light disc now sits on it.

Not done (left unticked in TASK.md):
- Tags, decision bar, band arc, round card, chevron: tags, card and chevron seen in the preview; band arc and the spatial click not checked by eye.
- verify-preview at stations 2 and 3: not captured (every preview refresh froze Lens Studio for minutes).
- Scene file not committed: it is unsaved in Lens Studio and its token inputs were not checked. Save it in Lens Studio, reset the three RSG token inputs to placeholders, then commit Assets/Scene.scene and Assets/GeneratedSFX.

Facts for the next session:
- Package names must match what the packages import: SpectaclesUIKit.lspkg (UI Kit 2.0.0), SpectaclesInteractionKit.lspkg (SIK 2.0.0), Leaf.lspkg (Leaf 2.0.2). A " 2" suffix breaks the UI Kit button shader (OpacityFactor missing, preview stops after 5 failed frames). These are the versions that work on Lens Studio 5.23.
- The LEAF editor plugin 5.23.0 does not connect to Leaf 2.0.2. Run scenarios with Assets/Tests/InLensRunner.ts: set its scenarioId, refresh the preview, read LEAF_INLENS lines in the Lens Studio log.
- After a Lens Studio restart the MCP server may move port; reconnect the session.
