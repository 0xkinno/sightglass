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
- Difference: none that this sample can show. 3 captures per gauge is too few to call it. What the crops show is that the band arc sits on the dial rim and the tag beside it; see `p4-crop-overlay-on-band-arc.jpg` against `p4-crop-overlay-off.jpg`. Hiding the overlay is kept because it costs a few frames and removes the risk, not because this run proved a gain.

## Speed and cost

- Median 3.2 s per read with thinking off, mean 4.4 s, worst 30.1 s (one outlier). Before thinking was turned off, two reads took 10 and 18 s.
- Tokens: not available. The gateway response carries `candidates`, `modelVersion`, `createTime` and `responseId` only, no usage count. The log line says `tokens=null`. Nothing is estimated.

## Not measured

- A real Spectacles camera frame, real lighting, motion or an engine room.
- Fault modes in the Lens (fault-lies, fault-garbage) and replay mode were built but not run in the preview in this phase. P5 covers them.
- The spatial click on a dot was not checked by eye in this phase.
