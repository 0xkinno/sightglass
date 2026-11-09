# TASK.md (Sightglass)

Tick `[x]` only when done and verified. One phase per session. Phase details: reference/SIGHTGLASS_BUILD_INSTRUCTION.md Part 10.

## P0. Setup and platform probe
- [ ] Lens Studio 5.23.2 open, signed in; SPECS Base Template saved as `Sightglass`
- [ ] Claude Code started in the project folder; `/mcp` shows lens-studio; `/plugin` shows CLAD
- [ ] `npx skills add challengepost/learn-specs --all -y`
- [ ] `.gitignore` (reference/, eval/data/, node_modules/, Cache/, Workspaces/, .mcp.json, .env*) committed first
- [ ] git identity set to 0xkinno; `.github/workflows/no-claude-attribution.yml` and `checks.yml` committed
- [ ] `reference/` populated (samples, dogwatch, ls-extensions, learn-specs, MeasureBench); `reference/banned_names.txt` written
- [ ] PLATFORM_PROBE (a) RSG token plugin + one Gemini text call answered (model id, ms)
- [ ] PLATFORM_PROBE (b) composite crop encodes to a non-blank JPEG in the preview
- [ ] PLATFORM_PROBE (c) one vision call on a composite crop returns parseable JSON
- [ ] PLATFORM_PROBE (d) InternetModule POST returns 200 with Device Type Override SPECS 27
- [ ] PLATFORM_PROBE.md written from those real outputs; probe objects deleted from the scene

## P1. Plan (Kinnoski answers plan-lens himself)
- [ ] `devpost/design-brief.md` written by plan-lens and approved (status: approved)
- [ ] Brief committed unedited; MOMENT.md and THESIS.md written from Part 4

## P2. Core
- [ ] Core files copied to `Assets/Scripts/Core/`, tests to `tests/`, root package.json with tsx and typescript
- [ ] `npx tsx --test tests/*.test.ts` passes (17 at start)
- [ ] Core compiles inside Lens Studio (RecompileTypeScriptTool clean)

## P3. Scene and flow (fixture reader)
- [ ] Three stations at real scale, 8 dials, numerals and units on faces, fog quad on AE1-LO, labelled stand-in
- [ ] PlantSim drives needles; LO inlet drifts to alarm during the round
- [ ] Tags, decision bar (Accept, Correct, By eye), band arc, round card, chevron with spatial click
- [ ] Alarm moment; READY disabled; HOLD with fixed escalations; sign summary with short code
- [ ] verify-preview from the user's eye at each station; placement fixed with design notes
- [ ] LEAF c1 to c5 written and passing on the fixture reader

## P4. Perception (live)
- [ ] FrameCapture: single requestCamera owner, composite crop from projected rim, overlay hidden for capture frame
- [ ] GaugeReader live via RSG (gemini-2.5-flash, JSON schema, temperature 0); SIGHTGLASS_READ log line with ms and tokens
- [ ] Fault switch modes: fixture, fault-lies, fault-garbage
- [ ] Fixtures recorded from live responses, one per gauge
- [ ] In-preview accuracy vs PlantSim: 8 gauges x 5 captures logged to devpost/evidence/preview-reads.log
- [ ] Overlay on vs off experiment logged; FINDINGS.md written

## P5. LEAF and breaks
- [ ] extra-overlay-hidden, extra-fault-reader, extra-pinch-targets, extra-chevron, extra-send written and passing
- [ ] One planted break per scenario seen red, restored byte-identical, logged in devpost/evidence/break-proofs.log
- [ ] c1 also run once in live mode; log kept
- [ ] Full suite run once; log saved

## P6. Handover door (cloud)
- [ ] Next.js app in web/ deployed to Vercel at its final URL (empty page first)
- [ ] /api/rounds (zod, caps, digest verified with Core), list, get, countersign, /api/status measured
- [ ] SheetSender points at the live URL; one full preview round lands on the door
- [ ] That round kept as the recorded judge sample, labelled with its date

## P7. Wild-set evaluation (cloud, parallel)
- [ ] PREREGISTRATION.md committed (hash noted)
- [ ] prep_measurebench.py run; SELECTION.txt committed; interval parser checked on real rows
- [ ] run_eval.ts both arms, 200 items; results/summary.json committed
- [ ] PROOF.md written from summary.json, misses included

## P8. Facts and docs
- [ ] scripts/facts.ts writes docs/FACTS.json; check_repo passes in CI
- [ ] tools/summarize_sessions.mjs writes CLAD session table into devpost/BUILD_LOG.md
- [ ] SDK_SURFACE.md with file:line and versions; "not used, so not claimed" rows
- [ ] EVIDENCE.md, JUDGE.md, MILESTONES.md, DISCLOSURES.md, THIRD_PARTY_NOTICES.md, LICENSE
- [ ] README per Part 13, numbers only from FACTS

## P9. Polish, red team, video, submit
- [ ] DESIGN.md; fonts; hero image in place; SVG instrument, mark, icons; glow cards; capsule nav; motion
- [ ] Playwright viewport suite green on 6 viewports; screenshots in docs/screens/
- [ ] Red team (5 roles) on repo, README and door until a clean round; REDTEAM_LOG.md
- [ ] Lane check (V5 22.8) done; README lead adjusted if a camera or Gemini rival appeared
- [ ] Video under 3:00 recorded, captioned, uploaded public (Kinnoski approves)
- [ ] SUBMISSION_DEVPOST.md; Kinnoski submits by 21:00 WAT
- [ ] Tag v1.0-submitted; deployment frozen
