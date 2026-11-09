# For judges

The machinery space in the Lens is a stand-in and is labelled so in the scene. The camera crop, the model call, the geometry, the evidence gate and the sending are live. The same content is on the door at `/judge`.

## 60 seconds: see it
1. Watch the film, https://youtu.be/66xntf96bA4 (2:50).
2. Read the landing page, https://sightglass-kinno.vercel.app
3. Open a signed sheet on the handover door, https://sightglass-kinno.vercel.app/handover
4. Check the digest line says it matches.

## 3 minutes: trust it
1. Read `/how`: the model points, code measures.
2. Read `/proof`, including the misses.
3. Countersign a round on the door. The button is bound to the digest on screen.

## 10 minutes: break it
1. `npm ci && npm test` for the 17 Core tests.
2. Open `Sightglass.esproj` in Lens Studio 5.23.2 and run a LEAF scenario with `Assets/Tests/InLensRunner.ts` (set `scenarioId`, refresh the preview, read `LEAF_INLENS` in the log).
3. Read `devpost/evidence/break-proofs.log`: one planted break per extra scenario, seen red, then restored.
4. Read `devpost/FINDINGS.md` for what did not work.
