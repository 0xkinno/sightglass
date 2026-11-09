# Devpost submission text

Fields mirror the Devpost form. Numbers come from `docs/FACTS.json`.

## Project name
Sightglass

## Tagline
A SPECS Lens for the engine room round. It reads each gauge as the engineer looks at it, and the engineer signs a log where every number was seen, not assumed.

## About the project (paste into the Markdown box)

## Inspiration
Every night on thousands of ships, an engineer walks the engine room before it runs unmanned and writes gauge readings in the engine log by hand. The published guidance is blunt about what happens when the engineer is rushed: the log "is also filled up in haste with assumed parameters". Nothing in the log says which numbers were looked at.

I am training toward a seagoing career, and that gap stayed with me. The thing that makes a round trustworthy is not a nicer form. It is knowing that each value was seen, by someone, at that gauge, a few minutes ago. Glasses are the first device where that can be true without a free hand, because the camera already shares the engineer's view while a torch is in one hand and a rag is in the other.

## What it does
The engineer looks at a gauge. Sightglass crops that dial from the camera view and asks Gemini for four points only: the pivot, the needle tip and the two ends of the scale. Code turns the points into a value using the scale printed on the round card. The model never supplies the scale or the number.

A tag at the dial rim shows the value, the unit and a verdict, with a thin arc on the rim for the normal band. The engineer accepts, corrects with plus and minus, or reads by eye. If the glass is fogged or the reader is unsure, the tag says "Can't read it" and offers By eye. It never shows a guess as a reading.

A reading below its alarm limit turns the tag coral, plays a cue from the dial, and the round card says the room can't go unmanned. Sign READY stays locked until a recheck, or a HOLD that says who was called. The signed sheet, its digest and the crops that were seen go to a handover door, where the chief engineer checks the digest still matches and countersigns exactly what was seen.

In the Lens Studio preview the engine room is a stand-in and is labelled so in the scene. The camera crop, the model call, the geometry, the evidence gate and the sending are live.

## How we built it
- **Planned first.** The design brief was written with the Devpost Learn `plan-lens` skill from my own answers and approved before any scene work.
- **Built in Lens Studio through CLAD.** The Lens was built with the CLAD agent skills (`specs-camera`, `specs-ai-remote-service`, `verify-preview`, `specs-leaf-run-in-preview`) and the Lens Studio MCP tools: seven Claude Code sessions and 327 tool calls, counted from the session logs by a script.
- **One camera owner.** `FrameCapture` is the only caller of `requestCamera`. It projects the dial rim to screen space, crops the scene render target (camera feed plus the virtual scene), and switches the overlay off for the one frame it captures.
- **The model points, code measures.** `GaugeReader` calls Gemini 2.5 Flash through Snap's Remote Service Gateway with a fixed JSON schema at temperature 0. The Core files (`DialGeometry`, `Verdict`, `EvidenceGate`, `RoundSheet`) are plain TypeScript with 17 unit tests, and the same files run in the Lens, in Node and on the door.
- **The door.** A Next.js app on Vercel with Blob storage accepts a signed sheet, checks the digest again with the same Core code, draws the reader's four points on each crop, and lets the chief engineer countersign.
- **Tested with LEAF.** Ten scenarios run in the preview with real pinches. For each of the five extra scenarios I planted one break, watched the test go red, and restored the file.

## Challenges we ran into
- **The picture was not the picture I thought.** The composite frame in the SPECS preview is squashed to half its width, so every dial arrives as an ellipse and my first live reads were wrong in a way that looked like the model's fault. Sightglass now measures the squash and undoes it before the geometry runs.
- **Pointing is the weak part.** Asked for four positions, the model places them roughly, and on three gauges it places them consistently high. Asked for the value directly, the same model is close. I tried a prompt line explaining the scale layout; it made things worse, so it is off and the log is kept.
- **Pinch targets that actually fit.** A measured test showed my targets were below 2 degrees at station distance. They became a column of large buttons, tags scale with distance, and 39 targets now pass.
- **Not claiming what did not happen.** The card used to say "Sent" at signing. It now says Sent only after the door answers 200 or 201.

## Accomplishments that we're proud of
- A complete round, start to finish: look, read, decide, alarm, sign, send, countersign, with the sheet drawn back on the door with the crops and the points the reader placed.
- Ten of ten LEAF scenarios pass, and five planted breaks each turned a test red.
- The misses are on the page. In 40 live captures, 15 of 34 readings were within one tick, with a median error of 1.25 ticks. Three gauges read high, one produced false alarms, and the fogged dial was read through.
- The door is public, deployed and accessible, checked on six viewports with headless Chrome (324 checks, no overlaps, no serious accessibility violations).

## What we learned
That an AI which sees what you see is not the same as an AI which reads a dial. The model is good at saying what it sees and poor at saying where, and a product that treats it as a measuring instrument inherits that. So the design keeps the model small, keeps the scale with a person, and makes every value pass a person before it counts. I also learned to measure my own interface: the pinch-target test found faults I had looked straight past.

## What's next for Sightglass
- Fix the pointing step: ask for the scale ends differently, or compute the angle from the model's own value as a cross-check and refuse when the two disagree.
- Finish the pre-registered evaluation on real dial photos. It is started and not finished, so the project claims no figure for it.
- Put the Lens on a device in a real machinery space and repeat the measurement there.
- Let the round card come from the ship's own checklist instead of an example.

## Built with (tags, comma separated)
lens-studio, snap-spectacles, spectacles-interaction-kit, spectacles-ui-kit, clad, lens-studio-mcp, claude-code, plan-lens, leaf, remote-service-gateway, gemini-2-5-flash, camera-module, internet-module, typescript, nextjs, react, vercel, vercel-blob, zod, playwright, node-js, ffmpeg

## Try it out links
- https://github.com/0xkinno/sightglass
- https://sightglass-kinno.vercel.app
- https://youtu.be/66xntf96bA4

## Video
https://youtu.be/66xntf96bA4 (2:50, recorded from the live door and the Lens Studio preview)
