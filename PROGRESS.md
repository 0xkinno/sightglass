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
- Still pending, needs P3/P4: SheetSender pointing at the live URL, a full preview round landing on the door, and keeping it as the recorded round.

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

P3 carry-over (9 Nov 2026): scene saved, committed (16a107c) with RSG token inputs reset to placeholders (checked by length only; staged diff has no "eyJ" and no 36-character token). Open: band arc and spatial click by eye, verify-preview at stations 2 and 3. Lens Studio stopped responding right after the commit (every MCP call timed out, then the socket closed and no Lens Studio process was left), so these were not checked and P4 has not started.

P4 (9 Nov 2026), mostly done. Numbers and misses: devpost/FINDINGS.md. Raw log: devpost/evidence/preview-reads.log.
- Built: Assets/Scripts/FrameCapture.ts (single requestCamera owner, rim-projected composite crop, overlay hidden for the capture frame), live GaugeReader (RSG, gemini-2.5-flash), modes fixture, live, replay, fault-lies, fault-garbage, driver Assets/Tests/AccuracyRun.ts, fixtures in Assets/Tests/fixtures (8 recorded live replies).
- Measured: 40 overlay-off and 24 overlay-on live captures. Median error 1.25 ticks, three gauges biased 4 to 6 ticks, one false ALARM on ME-JCW-OUT from a wrong point read. Fog stand-in too light (read through 7 of 8 times). Overlay on or off: no difference visible at this sample size.
- Preview composite is squashed 0.5 horizontally; FrameCapture measures it and GaugeReader corrects x before the geometry.
- Open boxes: GaugeReader tokens (gateway returns no usage count), fault modes not run in the preview, band arc seen on crops but the spatial click on a dot was not checked by eye (the PreviewInteract tool installs a package that breaks compilation here, so it was removed).
- Scene committed with token inputs at placeholders, reader mode fixture, AccuracyRun.run false. To re-run the accuracy driver: generate tokens, set AccuracyRun.run true, refresh, then reset tokens before any commit.
- Editing any .ts while the preview runs resets the lens and restarts a run in progress.

Update: the spatial click was then checked by eye by the owner (pinch on the STG-OIL dot in the preview opened the tag with 48 C Normal, band arc on the rim, Accept, Correct, By eye). That P3 box is ticked. P4 open items are unchanged: token count, fault modes not run in the preview, fog stand-in too light, pointing accuracy.

P5 (9 Nov 2026), done. Logs: devpost/evidence/leaf-p5-suite.log, devpost/evidence/break-proofs.log. FINDINGS.md has a P5 section.
- New: Assets/Scripts/SheetSender.ts (posts sheet, digest, crops to the door; the card says Sent only after 200 or 201), five scenarios in Assets/Tests/Extra*.ts, aimDial and resetRoom in the test kit (the driver turns the room, not the camera), liveReader switch on InLensRunner.
- Changed for the pinch-target rule: dot 5 cm, decision bar is a column with 2.2 cm gaps, tags scaled by distance, card gaps 1.5 to 1.6 cm.
- Results: c1 to c5 and all five extras pass on the fixture reader. One planted break per extra scenario went red and was restored from the commit. c1 in live mode FAILED (model put the scale-end marks wrong).
- Test rounds on the door: extra-send posts a real round every run, so several rounds from 9 Nov exist on the live door. The P6 item "kept as the recorded judge round, labelled with its date" is not done: that round should come from a run with live crops and be chosen by the owner.
- Scene committed with token inputs at placeholders, reader mode fixture, InLensRunner scenarioId empty, SheetSender target live.

Close-out (9 Nov 2026)
- Scale marks: one live read had put the scale ends on the wrong sides. A line telling the model how a 270 degree scale is laid out was tried in a second 64 capture run. It was not better (median error 2.24 ticks against 1.25, within one tick 8 of 32 against 15 of 34), so it is off by default and the log is kept as preview-reads-scale-hint.log. The three biased gauges remain a known open problem.
- Rename: the example round card constant is now UMS_EVENING_ROUND; the scene's machinery space object is named without the word sample.
- Web door: landing, /how, /proof, /judge and the handover pages, built from docs/FACTS.json (scripts/facts.mjs). Headless Chrome run, 6 viewports x 5 pages, 324 checks, 0 problems. Hero photograph optimised from 149 KB to 59 KB (plus a 27 KB mobile crop). The instrument sits in its own block under the hero so it does not cover the photograph.
- Docs: README, docs/DESIGN.md, DISCLOSURES.md, THIRD_PARTY_NOTICES.md, SDK_SURFACE.md, EVIDENCE.md, JUDGE.md, MILESTONES.md, FACTS.json, devpost/BUILD_LOG.md.
- Not done: P7 wild-set evaluation (needs a Gemini API key and the MeasureBench download), a production deploy of the new web pages (blocked in this session; run `cd web && npx vercel --prod`), the demo video, SUBMISSION_DEVPOST.md, the red team pass, Lighthouse run, the door drawing the four reader points on a crop (the crop pixels and the corrected x axis are not stored together).
- TASK.md was moved to reference/ (gitignored) at close-out. Its last state is there.
