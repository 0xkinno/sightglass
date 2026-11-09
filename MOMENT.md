# MOMENT

## The moment
It is 21:40 on a merchant ship. In about an hour the engine room will run unmanned for the night. The duty engineer walks every space on the evening round and reads every local gauge. One hand holds a torch and the other a rag. There are steps to climb and handrails to keep hold of.

Today each value is written in the engine log by hand. When the engineer is rushed, the log can fill up with assumed numbers.

## Who it is for
The duty engineer on a merchant ship, and the chief engineer who countersigns the round.

## What Sightglass does
The engineer looks at a gauge. Sightglass reads it from that view, shows the value, unit and status on a small tag beside the instrument, and draws the normal range as a thin arc on the dial. The engineer accepts the reading, corrects it, or reads it by eye. A chevron at the edge of view points to the next gauge. An amber edge alert means a reading needs checking. A red one means an alarm.

At the end the engineer has a round sheet. Each value comes with the frame it was read from and how it was verified. The engineer signs READY or HOLD. The sheet goes to the chief engineer for countersignature.

## Rules the product keeps
- A value enters the sheet only if the gauge was seen and the engineer accepted it, or the engineer read it by eye and the sheet says so.
- The room cannot be signed READY with a reading in alarm.
- If the reading is unclear, Sightglass says so. It does not guess.
- The model points at the needle and the scale. Code computes the value.

## Why glasses
- It shares the engineer's view: the reading comes from what the engineer is looking at.
- It draws in the world: the tag and the range arc sit on the instrument itself.
- It leaves the body free: the only inputs are a few large pinch targets, so the torch, the rag and the handrail stay in use.

## What is true, with sources
| What is true | Source |
|---|---|
| Nearly 60% of hull and machinery fire claims originated in the engine room (Gard claims, 2017 to 2024) | https://gard.no/insights/engine-room-fires-are-still-a-major-concern/ |
| Pressures and temperatures are recorded in the engine log every watch, and a rushed log can be filled in with assumed values | https://www.marineinsight.com/guidelines/7-important-points-to-consider-while-filling-out-engine-room-log-book/ |
| Before unmanned operation the duty engineer takes a complete round and the checklist is signed and logged | https://www.marineinsight.com/guidelines/preparation-for-ums-operation-on-ships/ |
| The best vision model tested reads 30.3% of real-world instruments correctly, and the common failure is locating the pointer | https://huggingface.co/datasets/FlagEval/MeasureBench |

## What is live and what is a stand-in
In the Lens Studio preview the engine room and its three gauges are stand-ins, labelled as such in the scene. A pinch on a dot beside a gauge stands for looking at it. The camera crop, the call to the model, the reading geometry, the evidence gate and the sending of the sheet are real.

## Founder note
No reply from a serving marine engineer is quoted here. None has been received.
