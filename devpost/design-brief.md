---
status: approved
---

# Design brief: Sightglass

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

## The one spatial moment
It is 21:40 aboard a merchant ship, about an hour before the engine room is scheduled to run unmanned overnight. I am the duty engineer walking through the engine room on the evening round, checking pressure gauges, temperature indicators and other instruments. I have a torch in one hand and a rag in the other. I move between machinery spaces and climb steps. As I look at each gauge, Sightglass reads it, shows the value and whether it is within normal limits on the instrument itself, and records the evidence, so I don't stop to pull out a notebook and write down every number. I stay in control of every reading and of the final READY or HOLD decision. At the end I have a round sheet of recorded values with their evidence frames and how each was verified, ready to send to the chief engineer for countersignature.

## Why it belongs on glasses
- Uses: shares your view (it reads the gauge I am looking at); draws in the world (the reading tag and range arc sit on the physical instrument); leaves your body free (one hand holds a torch, the other a rag, and I keep walking and climbing).
- Why it's better than the phone or laptop version: a phone or notebook needs a free hand and a stop at every gauge. Here the reading appears on the instrument as I look at it and the evidence is captured automatically.

## Product or overlay
- Type: overlay. It responds to real instruments.
- What the real version would sense: the real gauge in view. AI identifies the dial centre, needle tip and scale endpoints. The software calculates the actual reading from the needle position rather than trusting an AI-generated number. If the reading is unclear, the system says so instead of guessing.
- Stand-in for the preview: (default) a virtual engine room with three representative gauges at real size, clearly labelled as stand-ins in the scene. "Looking at a gauge" is a pinch on a small dot beside it. The gauges are a normal pressure gauge, a partially obscured gauge, and a gauge showing an abnormal reading. Hard-coded fallback readings are available so the demo never depends on a live AI call. The reading calculation, the tag and arc, Accept, Correct, By eye, the edge alerts, the round sheet and the READY or HOLD logic are built for real.

## Where things live
- Where the user is looking during the main task: at the gauge being checked.
- Reading tag: a small tag beside the physical gauge, near its rim, showing the measured value, unit and operating status. Anchored to the gauge, not to my head.
- Normal-range arc: a thin, subtle coloured arc around the dial showing the normal operating range, anchored to the gauge.
- Directional chevron: a small chevron at the edge of my view that guides me to the next gauge after I finish one.
- Edge alert: a clear visual alert at the edge of my view with a direction indicator showing which gauge needs attention.
- Overlays stay attached to their instruments as I move around. They do not follow my head and there is no large floating dashboard.
- Round sheet: (default) appears at the end of the round about 60 to 80 cm in front of me, a little below eye level, about 30 cm wide and 20 cm tall.
- Accept, Correct and By eye buttons: (default) on or next to the reading tag, each at least 4 cm across.

## Hands and input
- Accept: pinch a large target to confirm the proposed reading.
- Correct: adjust a reading the system interpreted incorrectly (default: with large plus and minus pinch buttons).
- By eye: read the instrument myself and enter the value when the system cannot produce a reliable measurement.
- Send: (default) pinch a button to send the completed sheet to the chief engineer.
- Every reading keeps whether it was accepted, corrected or entered by eye.
- Targets are big and highlight when aimed at. No complicated gestures. One hand holds a torch and the other a rag, so interactions are few and large.
- Voice (if any) and the button that does the same job: none.

## When things show
- Reading tag and range arc: shows when I look at a gauge, stays attached to it, and stays out of the way for gauges I haven't reached.
- Unusual or out-of-range reading: clearly highlighted. The system must not silently record an uncertain measurement as fact.
- Chevron: shows when I finish a gauge and points to the next one.
- Edge alert: amber means a reading needs verification, red means an alarm condition. It stays visible until I inspect the instrument. Normal readings produce no notification. The glasses guide my attention only when something actually needs me.
- If something needs attention out of view: the edge alert with a direction indicator.
- Round sheet: shows at the end of the round.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Gauge recognition and placement: when I look at a gauge, Sightglass identifies it and shows a reading tag and normal-range arc correctly positioned around the physical instrument.
2. Actual measurement: the AI identifies the needle and scale landmarks, while the software calculates the numerical reading. The displayed value comes from that calculation, not an AI guess.
3. Uncertainty handling: when a gauge is obscured or the needle cannot be located reliably, the system refuses to invent a number and offers a by-eye reading option.
4. Human verification: I can accept, correct or record a reading by eye using simple pinch interactions. Every action is reflected in the round sheet alongside its source evidence.
5. READY or HOLD decision: the system generates a completed round sheet, but prevents READY sign-off if any required reading is missing, unverified or in an alarm condition. It records HOLD instead.

The preview should demonstrate the complete experience, from inspecting the first gauge to producing a verified round sheet and making the final operational decision.

## Demo walk-through
1. A normal pressure gauge: Sightglass identifies the dial, calculates the reading, shows the value, and I accept it.
2. A partially obscured gauge: the system refuses to guess because it cannot establish a reliable reading. I record the measurement by eye.
3. A gauge showing an abnormal reading: Sightglass highlights the alarm condition and asks me to verify. I confirm it.
4. The round sheet shows the recorded values, their evidence frames and how each was verified. Because one instrument is in an alarm condition, READY is blocked and HOLD is recorded.
5. The completed sheet can be sent to the chief engineer for countersignature.

## Out of scope
- Connecting to a real ship, real instruments or a real engine room.
- Recognizing real gauges through live camera vision in the preview.
- Voice commands.
- A large floating dashboard.
- Anything that records, identifies or follows people.

## Risks and open questions
- The preview can't recognize real gauges. It uses virtual stand-in gauges and a pinch on a dot to stand for looking at one. Real recognition is untested.
- AI reading may not work in the preview, so a hard-coded fallback is planned.
- Comfort, torch and rag use, and hand tracking while climbing and walking can only be judged on real glasses (feel unproven).
- Real engine-room lighting, glare and vibration are not simulated.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
