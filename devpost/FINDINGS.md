# FINDINGS (P4, perception, 9 November 2026)

All numbers come from `devpost/evidence/preview-reads.log`, produced by `Assets/Tests/AccuracyRun.ts` in the Lens Studio 5.23.2 preview (device SPECS 27, Interactive input, Plane scene). Statistics: `node scripts/p4_summarize.mjs`. Misses are included. This is a stand-in room in a simulator, not a real engine room.

## Setup that was measured

- Reader: gemini-2.5-flash through Snap's Remote Service Gateway 0.2.0, temperature 0, JSON schema from `Core/ReaderContract.ts`. The prompt is the shared contract, unchanged. Two live-only request settings were used: a line telling the model the crop size in pixels, and thinking budget 0.
- Capture: the scene render target (camera feed plus the virtual room), cropped to the projected dial rim plus 15 percent, JPEG, about 616 by 616 px. The overlay is off for the capture frame.
- Truth: PlantSim value at the moment of capture. ME-LO-IN was pinned at one point of its drift.
- The driver turned the stand-in room so each dial was straight ahead. The preview camera did not move. Dials still sit up to 22 degrees off the view axis for station 1.
- 8 gauges x 5 captures with the overlay off (40), plus 3 captures per gauge with the overlay on (24).

## Accuracy, overlay off (the shipped path)

- 35 captures were of legible dials. 34 gave a value, 1 came back "Can't read it".
- Error against PlantSim, in minor ticks: median 1.25, mean 2.71, worst 6.37. 15 of 34 within 1 tick, 18 of 34 within 2 ticks.
- Three gauges were off by a steady 4 to 6 ticks: ME-JCW-OUT (mean +5.7), ME-SCAV (+4.9) and AIR-START (+4.2). The other five gauges sat near 1 tick, which is also about the resolution the value is rounded to.
- The model's own guess of the value (the `model_value` field, not used as the answer) was much closer on those three: mean error 0.9, 0.03 and 0.29 ticks. So on this set the model reads the number better than it points to the marks. The pointing step is the weak part.
- One miss matters: on ME-JCW-OUT the point-based read was 93 to 94 degC against a true 82. The verdict for 94 is ALARM. A wrong geometry read on a legible dial can raise a false alarm. The person still has to accept or correct it, which is the design, but this is the first thing to fix.

## The composite is squashed

The render target was 1392 by 3180 while the camera projects at aspect 0.875, so the picture is about half as wide as it should be. Dials arrive as ellipses. The first live reads, before this was corrected, gave 2.9 and 3.0 against 2.56. `FrameCapture.stretchX()` now measures the squash and `GaugeReader` divides the model's x coordinates by it before the geometry runs. The render target size follows the Preview panel size, so the factor is measured at run time, not fixed. I did not measure whether a real Spectacles frame has the same squash.

## Fog stand-in

The fogged dial (AE1-LO) came back "Can't read it" in 1 of 5 captures with the overlay off and 0 of 3 with it on. In the other captures the model read 5.0 (truth 5.2). The fog quad in the scene is too light: the numerals and needle show through. So the legibility gate was not exercised by this stand-in. LEAF c3 still passes because it uses the fixture reader. A stronger fog is needed before claiming the gate works on a real image.

## Overlay on versus off

- Overlay off: mean error 2.71 ticks, median 1.25, 15 of 34 within 1 tick (44 percent).
- Overlay on (tag open, band arc visible): mean 2.79, median 1.10, 9 of 20 within 1 tick (45 percent).
- Difference: none that this set can show. 3 captures per gauge is too few to call it. What the crops show is that the band arc sits on the dial rim and the tag beside it; see `p4-crop-overlay-on-band-arc.jpg` against `p4-crop-overlay-off.jpg`. Hiding the overlay is kept because it costs a few frames and removes the risk, not because this run proved a gain.

## Speed and cost

- Median 3.2 s per read with thinking off, mean 4.4 s, worst 30.1 s (one outlier). Before thinking was turned off, two reads took 10 and 18 s.
- Tokens: not available. The gateway response carries `candidates`, `modelVersion`, `createTime` and `responseId` only, no usage count. The log line says `tokens=null`. Nothing is estimated.

## Not measured

- A real Spectacles camera frame, real lighting, motion or an engine room.
- Fault modes in the Lens (fault-lies, fault-garbage) and replay mode were built but not run in the preview in this phase. P5 covers them.
- The spatial click on a dot was not checked by eye in this phase.

## P5 additions (9 November 2026)

- **Pinch targets failed, then were fixed.** The first measurement showed dots at 1.2 to 1.9 degrees and button gaps at 0.5 degrees, below the 2 and 1 degree rules at station distance (122 to 163 cm). Fixes: dot 5 cm, buttons 4.8 by 4.6 cm with 2.2 cm gaps in a column under the tag (a row did not fit between two dials), tags scaled with distance (1.0 at station 1 up to 1.36 at station 3), round card gaps 1.5 to 1.6 cm. After that 39 targets measured, 0 problems. The dot slider had also been snapping 4.4 cm to 4.0 cm, and `RoundButton` takes its size from `width`, not `size`; both were found by this scenario.
- **The model puts the scale-end marks in the wrong place.** In the live run of c1 (SW-PUMP), the model returned the lowest and highest marks at 180 and 0 degrees (left and right of the pivot) instead of the lower left and lower right ends of the 270 degree sweep. Code computed 3.5 bar against a true 2.82. The same effect probably explains the three gauges that were biased by 4 to 6 ticks in P4. c1 in live mode is red and the log is kept. Not fixed. A prompt that states the sweep is the likely fix, but the prompt is the shared contract with the wild-set evaluation, so it needs a decision.
- **Fault modes in the Lens.** A lying reader (needle 90 degrees off) and a garbage reader never create an entry on their own. A lie is a proposal with a wrong number until a person accepts it; a person who accepts a lie records a SEEN entry with that number. The gate does not catch a wrong number a person agrees with.
- **Sending.** The card used to say "Sent to the chief engineer" at signing, before anything was sent. It now says "Sending", then "Sent" only after a 200 or 201, and "Not sent" otherwise. One real round was posted to the live door and read back with a matching digest. Running extra-send posts a new round each time, so the door holds several test rounds from 9 November. They are labelled by their round id only.

## Scale hint tried and dropped (9 November 2026)

After the live c1 run showed the model putting the scale-end marks left and right of the pivot, a second 64 capture run added one line to the live request saying the scale sweeps 270 degrees with the lowest mark at the lower left and the highest at the lower right. It was not better: median error 2.24 ticks against 1.25, within one tick 8 of 32 against 15 of 34, three legible dials refused against one. The three biased gauges (jacket water outlet, scavenge air, starting air) stayed 5 to 7 ticks high. The hint is off by default and both logs are kept: `preview-reads.log` (shipped) and `preview-reads-scale-hint.log`.

## Door crops and the wild set (9 November 2026)

- **The door draws the reader's points.** `SheetSender` now sends, beside the frames, the four points as fractions of the crop that was sent (`overlays`, outside the digest). The Lens converts its corrected points back to the stored image before sending. A live round of eight reads was sent from the preview, accepted with HTTP 201, read back, and drawn with teal rings on every crop (`devpost/evidence/leaf-p5-send-live.log`, `docs/screens/door-crops-live.webp`). The rings make the open problem visible: on the crops the lowest and highest mark rings sit below the dial.
- **Wild set not finished.** The pre-registered model returns 404 for the API key available, the named replacement did not answer, and the evaluation was moved to gemini-3.5-flash by Amendment 1 (committed before the run). The run is slow and had not completed when this was written. No figure is claimed.
